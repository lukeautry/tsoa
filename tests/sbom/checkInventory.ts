import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

type Ref = string & { readonly __ref: unique symbol };
interface Component {
  identity: string;
  version?: string;
  purl?: string;
}
interface Inventory {
  root: Ref;
  components: Map<Ref, Component>;
  edges: Map<Ref, Set<Ref>>;
}
export interface Workspace {
  name: string;
  version: string;
  declared: Set<string>;
}
export type InventoryProblem =
  | { kind: 'malformed'; detail: string }
  | { kind: 'duplicate-ref' | 'dangling-ref' | 'missing-version'; ref: string }
  | { kind: 'missing-workspace'; name: string; version: string }
  | { kind: 'version-mismatch'; name: string; manifestVersion: string; found: string[] }
  | { kind: 'missing-edge'; from: string; to: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function parseInventory(json: unknown): Inventory | InventoryProblem[] {
  const malformed = (detail: string): InventoryProblem[] => [{ kind: 'malformed', detail }];
  if (!isObject(json) || json.bomFormat !== 'CycloneDX' || json.specVersion !== '1.6') {
    return malformed('Expected a CycloneDX 1.6 document');
  }
  if (!isObject(json.metadata) || !isObject(json.metadata.component) || !isString(json.metadata.component['bom-ref'])) {
    return malformed('Expected metadata.component with a bom-ref');
  }
  if (!Array.isArray(json.components) || json.components.length === 0 || !Array.isArray(json.dependencies)) {
    return malformed('Expected nonempty components and a dependencies array');
  }

  const root = json.metadata.component['bom-ref'] as Ref;
  const components = new Map<Ref, Component>();
  const edges = new Map<Ref, Set<Ref>>();
  const problems: InventoryProblem[] = [];
  for (const value of [json.metadata.component, ...json.components]) {
    if (
      !isObject(value) ||
      !isString(value['bom-ref']) ||
      !isString(value.name) ||
      (value.group !== undefined && typeof value.group !== 'string') ||
      (value.version !== undefined && !isString(value.version)) ||
      (value.purl !== undefined && !isString(value.purl))
    ) {
      problems.push({ kind: 'malformed', detail: 'Invalid component identity, version, purl or bom-ref' });
      continue;
    }
    const ref = value['bom-ref'] as Ref;
    if (components.has(ref)) {
      problems.push({ kind: 'duplicate-ref', ref });
      continue;
    }
    const component: Component = {
      identity: value.group ? `${value.group}/${value.name}` : value.name,
      version: value.version,
      purl: value.purl,
    };
    if (component.purl?.startsWith('pkg:npm/')) {
      if (ref !== root && !component.version) {
        problems.push({ kind: 'missing-version', ref });
      }
      try {
        const packagePath = component.purl.slice('pkg:npm/'.length).split(/[?#]/)[0];
        const separator = packagePath.lastIndexOf('@');
        const hasVersion = separator > 0;
        const identity = decodeURIComponent(hasVersion ? packagePath.slice(0, separator) : packagePath);
        const version = hasVersion ? decodeURIComponent(packagePath.slice(separator + 1)) : undefined;
        if (identity !== component.identity || version !== component.version) {
          problems.push({ kind: 'malformed', detail: `purl disagrees with component identity or version at ${ref}` });
        }
      } catch {
        problems.push({ kind: 'malformed', detail: `Invalid purl encoding at ${ref}` });
      }
    }
    components.set(ref, component);
  }

  for (const value of json.dependencies) {
    if (!isObject(value) || !isString(value.ref) || (value.dependsOn !== undefined && (!Array.isArray(value.dependsOn) || !value.dependsOn.every(isString)))) {
      problems.push({ kind: 'malformed', detail: 'Expected dependency ref and a string array for dependsOn when present' });
      continue;
    }
    const ref = value.ref as Ref;
    if (edges.has(ref)) {
      problems.push({ kind: 'duplicate-ref', ref });
    } else {
      edges.set(ref, new Set((value.dependsOn ?? []) as Ref[]));
    }
  }
  return problems.length ? problems : { root, components, edges };
}

export function readWorkspaces(repoRoot: string): Workspace[] {
  const manifest: unknown = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  if (!isObject(manifest) || !Array.isArray(manifest.workspaces) || !manifest.workspaces.length || !manifest.workspaces.every(isString)) {
    throw new Error('Expected a nonempty workspaces array in package.json');
  }
  const paths = new Set<string>();
  for (const pattern of manifest.workspaces) {
    const prefix = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
    if (/[!*?{}[\]]/.test(prefix)) {
      throw new Error(`Unsupported workspace pattern: ${pattern}`);
    }
    if (pattern.endsWith('/*')) {
      for (const child of readdirSync(join(repoRoot, prefix), { withFileTypes: true })) {
        const path = join(repoRoot, prefix, child.name, 'package.json');
        if (child.isDirectory() && existsSync(path)) paths.add(path);
      }
    } else {
      paths.add(join(repoRoot, pattern, 'package.json'));
    }
  }
  if (!paths.size) throw new Error('No workspace manifests found');
  return [...paths].map(path => {
    const workspace: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!isObject(workspace) || !isString(workspace.name) || !isString(workspace.version)) {
      throw new Error(`Expected workspace name and version in ${path}`);
    }
    const declared = new Set<string>();
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      const dependencies = workspace[field];
      if (dependencies === undefined) continue;
      if (!isObject(dependencies)) throw new Error(`Expected ${field} object in ${path}`);
      for (const name of Object.keys(dependencies)) declared.add(name);
    }
    return { name: workspace.name, version: workspace.version, declared };
  });
}

export function checkInventory(inv: Inventory, workspaces: Workspace[]): InventoryProblem[] {
  const problems: InventoryProblem[] = [];
  for (const [source, targets] of inv.edges) {
    for (const ref of [source, ...targets]) {
      if (!inv.components.has(ref)) problems.push({ kind: 'dangling-ref', ref });
    }
  }
  for (const workspace of workspaces) {
    const candidates = [...inv.components].filter(([, component]) => component.identity === workspace.name);
    const exact = candidates.filter(([, component]) => component.version === workspace.version);
    if (!exact.length) {
      problems.push(
        candidates.length
          ? { kind: 'version-mismatch', name: workspace.name, manifestVersion: workspace.version, found: candidates.map(([, component]) => component.version ?? '') }
          : { kind: 'missing-workspace', name: workspace.name, version: workspace.version },
      );
      continue;
    }
    if (!exact.some(([ref]) => inv.edges.get(inv.root)?.has(ref))) {
      problems.push({ kind: 'missing-edge', from: inv.root, to: workspace.name });
    }
    const declaredTargets = new Set(exact.flatMap(([ref]) => [...(inv.edges.get(ref) ?? [])].map(target => inv.components.get(target)?.identity)));
    for (const name of workspace.declared) {
      if (!declaredTargets.has(name)) problems.push({ kind: 'missing-edge', from: workspace.name, to: name });
    }
  }
  return problems;
}

if (require.main === module) {
  try {
    const path = process.argv[2];
    if (!path) throw new Error('Usage: checkInventory.ts <sbom.json>');
    const parsed = parseInventory(JSON.parse(readFileSync(path, 'utf8')));
    const workspaces = readWorkspaces(process.cwd());
    const problems = Array.isArray(parsed) ? parsed : checkInventory(parsed, workspaces);
    for (const problem of problems) console.error(JSON.stringify(problem));
    if (problems.length) {
      process.exitCode = 1;
    } else if (!Array.isArray(parsed)) {
      console.log(`Validated ${parsed.components.size - 1} components and ${workspaces.length} workspaces`);
    }
  } catch (error) {
    console.error(JSON.stringify({ kind: 'malformed', detail: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}
