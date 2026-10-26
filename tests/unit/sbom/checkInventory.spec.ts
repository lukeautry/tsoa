import { expect } from 'chai';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { checkInventory, InventoryProblem, parseInventory, readWorkspaces, Workspace } from '../../sbom/checkInventory';

function fixture() {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    metadata: { component: { 'bom-ref': 'root', name: 'private-project', purl: 'pkg:npm/private-project' } },
    components: [
      { 'bom-ref': 'workspace', group: '@sample', name: 'library', version: '1.2.3', purl: 'pkg:npm/%40sample/library@1.2.3', scope: 'required' },
      { 'bom-ref': 'tests', name: 'test-workspace', version: '4.5.6', purl: 'pkg:npm/test-workspace@4.5.6' },
      { 'bom-ref': 'external-new', name: 'external', version: '2.0.0', purl: 'pkg:npm/external@2.0.0', scope: 'optional' },
      { 'bom-ref': 'external-old', name: 'external', version: '1.0.0', purl: 'pkg:npm/external@1.0.0', scope: 'excluded' },
    ],
    dependencies: [
      { ref: 'root', dependsOn: ['workspace', 'tests'] },
      { ref: 'workspace', dependsOn: ['external-new'] },
      { ref: 'tests', dependsOn: ['workspace', 'external-old'] },
      { ref: 'external-new', dependsOn: [] },
    ],
  };
}

function workspaces(): Workspace[] {
  return [
    { name: '@sample/library', version: '1.2.3', declared: new Set(['external']) },
    { name: 'test-workspace', version: '4.5.6', declared: new Set(['@sample/library', 'external']) },
  ];
}

function problems(json: unknown): InventoryProblem[] {
  const parsed = parseInventory(json);
  return Array.isArray(parsed) ? parsed : checkInventory(parsed, workspaces());
}

describe('checkInventory', () => {
  it('accepts opaque refs, an unversioned root, distinct workspace versions, duplicate package versions and optional scopes', () => {
    expect(problems(fixture())).to.deep.equal([]);
  });

  it('accepts an omitted dependsOn for a leaf and does not require a graph entry for every component', () => {
    const doc = fixture();
    doc.dependencies.push({ ref: 'external-old' } as (typeof doc.dependencies)[number]);
    expect(problems(doc)).to.deep.equal([]);
  });

  it('accepts a qualified npm purl and another version of a workspace package', () => {
    const doc = fixture();
    doc.components[0].purl += '?repository_url=https%3A%2F%2Fregistry.npmjs.org';
    doc.components.push({ ...doc.components[0], 'bom-ref': 'old-workspace', version: '0.9.0', purl: 'pkg:npm/%40sample/library@0.9.0' });
    expect(problems(doc)).to.deep.equal([]);
  });

  it('accepts two refs for the same workspace version when only one has the declared edges', () => {
    const doc = fixture();
    doc.components.push({ ...doc.components[0], 'bom-ref': 'another-workspace-ref' });
    expect(problems(doc)).to.deep.equal([]);
  });

  const malformed: Array<[string, unknown]> = [
    ['non-object input', null],
    ['array input', []],
    ['wrong format', { ...fixture(), bomFormat: 'SPDX' }],
    ['wrong spec version', { ...fixture(), specVersion: '1.5' }],
    ['missing metadata component', { ...fixture(), metadata: {} }],
    ['missing root ref', { ...fixture(), metadata: { component: { name: 'private-project' } } }],
    ['empty components', { ...fixture(), components: [] }],
    ['missing components', { ...fixture(), components: undefined }],
    ['missing dependencies', { ...fixture(), dependencies: undefined }],
    ['invalid dependsOn', { ...fixture(), dependencies: [{ ref: 'root', dependsOn: 'workspace' }] }],
    ['invalid dependsOn member', { ...fixture(), dependencies: [{ ref: 'root', dependsOn: [null] }] }],
    ['invalid dependency ref', { ...fixture(), dependencies: [{ ref: 5 }] }],
    ['invalid component', { ...fixture(), components: [null] }],
  ];
  for (const [name, input] of malformed) {
    it(`rejects ${name}`, () => {
      expect(problems(input).map(problem => problem.kind)).to.include('malformed');
    });
  }

  const mutations: Array<[string, InventoryProblem['kind'], (doc: ReturnType<typeof fixture>) => void]> = [
    ['duplicate component ref', 'duplicate-ref', doc => doc.components.push(doc.components[0])],
    ['root ref reused by a component', 'duplicate-ref', doc => (doc.components[0]['bom-ref'] = 'root')],
    ['duplicate dependency ref', 'duplicate-ref', doc => doc.dependencies.push(doc.dependencies[0])],
    ['npm component without version', 'missing-version', doc => Reflect.deleteProperty(doc.components[0], 'version')],
    ['purl identity mismatch', 'malformed', doc => (doc.components[0].purl = 'pkg:npm/other@1.2.3')],
    ['purl version mismatch', 'malformed', doc => (doc.components[0].purl = 'pkg:npm/%40sample/library@9.0.0')],
    ['invalid purl encoding', 'malformed', doc => (doc.components[0].purl = 'pkg:npm/%ZZ@1.2.3')],
    ['missing workspace', 'missing-workspace', doc => doc.components.splice(0, 1)],
    [
      'wrong workspace version',
      'version-mismatch',
      doc => {
        doc.components[0].version = '9.0.0';
        doc.components[0].purl = 'pkg:npm/%40sample/library@9.0.0';
      },
    ],
    ['missing root edge', 'missing-edge', doc => doc.dependencies[0].dependsOn.shift()],
    ['missing declared dependency edge', 'missing-edge', doc => (doc.dependencies[1].dependsOn = [])],
    ['dangling target', 'dangling-ref', doc => doc.dependencies[0].dependsOn.push('unknown')],
    ['dangling source', 'dangling-ref', doc => doc.dependencies.push({ ref: 'unknown', dependsOn: [] })],
  ];
  for (const [name, kind, mutate] of mutations) {
    it(`rejects ${name}`, () => {
      const doc = fixture();
      mutate(doc);
      expect(problems(doc).map(problem => problem.kind)).to.include(kind);
    });
  }
});

describe('readWorkspaces', () => {
  let root: string;
  const write = (path: string, value: unknown) => {
    const fullPath = join(root, path, 'package.json');
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(value));
  };
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'check-inventory-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('discovers wildcard children and literal paths and unions dependency scopes without peers', () => {
    write('', { workspaces: ['packages/*', 'checks', 'checks/esm'] });
    write('packages/library', { name: '@sample/library', version: '1.2.3', dependencies: { external: '*' }, optionalDependencies: { optional: '*' } });
    mkdirSync(join(root, 'packages', 'not-a-package'));
    write('checks', { name: 'checks', version: '4.5.6', devDependencies: { '@sample/library': '*' }, peerDependencies: { peer: '*' } });
    write('checks/esm', { name: 'checks-esm', version: '7.8.9' });
    expect(readWorkspaces(root)).to.deep.equal([
      { name: '@sample/library', version: '1.2.3', declared: new Set(['external', 'optional']) },
      { name: 'checks', version: '4.5.6', declared: new Set(['@sample/library']) },
      { name: 'checks-esm', version: '7.8.9', declared: new Set() },
    ]);
  });

  for (const pattern of ['packages/**', 'packages/?', 'packages/{a,b}', 'packages/[ab]', '!checks', 'packages/*/nested']) {
    it(`rejects unsupported pattern ${pattern}`, () => {
      write('', { workspaces: [pattern] });
      expect(() => readWorkspaces(root)).to.throw('Unsupported workspace pattern');
    });
  }

  it('rejects an unversioned workspace', () => {
    write('', { workspaces: ['checks'] });
    write('checks', { name: 'checks' });
    expect(() => readWorkspaces(root)).to.throw('Expected workspace name and version');
  });

  it('rejects malformed dependency declarations', () => {
    write('', { workspaces: ['checks'] });
    write('checks', { name: 'checks', version: '1.0.0', dependencies: [] });
    expect(() => readWorkspaces(root)).to.throw('Expected dependencies object');
  });

  it('rejects an empty workspace inventory', () => {
    write('', { workspaces: [] });
    expect(() => readWorkspaces(root)).to.throw('Expected a nonempty workspaces array');
  });
});
