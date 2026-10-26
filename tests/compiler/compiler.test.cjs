const assert = require('node:assert/strict');
const test = require('node:test');
const { readdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const compiler = require('../../packages/cli/dist/compiler');
const { MetadataGenerator } = require('../../packages/cli/dist/metadataGeneration/metadataGenerator');
const fixture = path.resolve(__dirname, '../fixtures/compiler/backendController.ts');

test('compiler selection accepts only typescript and tsrs', () => {
  const before = process.env.TSOA_COMPILER;
  try {
    delete process.env.TSOA_COMPILER;
    assert.equal(compiler.compilerPackage(), 'typescript');
    process.env.TSOA_COMPILER = 'typescript';
    assert.equal(compiler.compilerPackage(), 'typescript');
    process.env.TSOA_COMPILER = 'tsrs';
    assert.equal(compiler.compilerPackage(), 'tsrs');
    process.env.TSOA_COMPILER = 'other';
    assert.throws(() => compiler.compilerPackage(), /Unknown TSOA_COMPILER/);
  } finally {
    if (before === undefined) delete process.env.TSOA_COMPILER;
    else process.env.TSOA_COMPILER = before;
  }
});

test('async generation reads decorators, JSDoc, parameter tags and conditional aliases', async () => {
  const metadata = await compiler.withCompiler(() => new MetadataGenerator(fixture, { experimentalDecorators: true }).Generate());
  assert.equal(metadata.controllers.length, 1);
  const method = metadata.controllers[0].methods.find(method => method.name === 'get');
  assert.equal(method.description, 'Read a model.');
  assert.equal(method.parameters[0].description, 'The model identifier.');
  assert.equal(method.parameters[0].type.dataType, 'integer');
  assert.equal(metadata.referenceTypeMap.BackendModel.description, 'A compiler fixture.');
  assert.equal(metadata.referenceTypeMap.BackendModel.properties[0].description, 'A label.');
});

test('compiler sessions remove temporary projects after errors', async () => {
  const projects = () =>
    readdirSync(tmpdir())
      .filter(name => name.startsWith('tsoa-compiler-'))
      .sort();
  const before = projects();
  await assert.rejects(
    compiler.withCompiler(() => {
      new MetadataGenerator(fixture, { experimentalDecorators: true });
      throw new Error('generation failed');
    }),
    /generation failed/,
  );
  assert.deepEqual(projects(), before);
});

test('the synchronous entry rejects native backends', () => {
  const before = process.env.TSOA_COMPILER;
  try {
    process.env.TSOA_COMPILER = 'tsrs';
    assert.throws(() => new MetadataGenerator(fixture), /native compilers require an async generation entry point/);
  } finally {
    if (before === undefined) delete process.env.TSOA_COMPILER;
    else process.env.TSOA_COMPILER = before;
  }
});

test('the built CommonJS CLI passes tsoa.json compiler options to spec and route generation', () => {
  const { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } = require('node:fs');
  const { spawnSync } = require('node:child_process');
  const directory = mkdtempSync(path.join(tmpdir(), 'tsoa-cli-test-'));
  try {
    const config = path.join(directory, 'tsoa.json');
    const entryFile = path.join(directory, 'controller.ts');
    writeFileSync(
      entryFile,
      `import { Get, Route } from '@tsoa/runtime';
import { BackendModel } from 'compiler-options-model';
@Route('compiler-options')
export class CompilerOptionsController {
  @Get()
  public get(): BackendModel { throw new Error(); }
}
`,
    );
    writeFileSync(
      config,
      JSON.stringify({
        entryFile,
        compilerOptions: {
          experimentalDecorators: true,
          paths: {
            '@tsoa/runtime': [path.resolve(__dirname, '../../packages/runtime/dist')],
            'compiler-options-model': [fixture],
          },
        },
        spec: { outputDirectory: directory, specVersion: 3.1 },
        routes: { routesDir: directory },
      }),
    );
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../packages/cli/dist/cli.js'), 'spec-and-routes', '-c', config], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(path.join(directory, 'swagger.json')));
    assert.ok(existsSync(path.join(directory, 'routes.ts')));
    const swagger = JSON.parse(readFileSync(path.join(directory, 'swagger.json'), 'utf8'));
    assert.equal(swagger.paths['/compiler-options'].get.responses['200'].content['application/json'].schema.$ref, '#/components/schemas/BackendModel');
    assert.equal(swagger.components.schemas.BackendModel.properties.label.type, 'string');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('optionalPropertyController preserves optional interface and class properties', async () => {
  const optionalFixture = path.resolve(__dirname, '../fixtures/compiler/optionalPropertyController.ts');
  const metadata = await compiler.withCompiler(() => new MetadataGenerator(optionalFixture, { experimentalDecorators: true }).Generate());
  assert.equal(metadata.referenceTypeMap.OptionalModel.properties[0].required, false);
  assert.deepEqual(
    metadata.referenceTypeMap.OptionalClassModel.properties.map(({ name, required }) => ({ name, required })),
    [
      { name: 'label', required: false },
      { name: 'requiredLabel', required: true },
    ],
  );
});

test('complexTypeController preserves optional properties on compiler-built PaginationQuery nodes', async () => {
  const complexFixture = path.resolve(__dirname, '../fixtures/controllers/complexTypeController.ts');
  const metadata = await compiler.withCompiler(() => new MetadataGenerator(complexFixture, { experimentalDecorators: true, strictNullChecks: true, skipLibCheck: true }).Generate());
  const method = metadata.controllers[0].methods.find(method => method.name === 'getPaginationQuery');
  assert.deepEqual(
    method.parameters[0].type.properties.map(({ name, required }) => ({ name, required })).sort((a, b) => a.name.localeCompare(b.name)),
    [
      { name: 'limit', required: true },
      { name: 'page', required: true },
      { name: 'sortBy', required: false },
      { name: 'sortOrder', required: false },
    ],
  );
});

test('prettyLocationOfNode falls back for synthetic nodes without changing source locations', async () => {
  const { prettyLocationOfNode } = require('../../packages/cli/dist/metadataGeneration/exceptions');
  await compiler.withCompiler(() => {
    const program = compiler.createProgram([fixture], { experimentalDecorators: true });
    const source = program.getSourceFiles().find(source => source.fileName === fixture);
    const model = source.statements.find(node => node.name?.text === 'BackendModel');
    const checker = program.getTypeChecker();
    const synthetic = checker.typeToTypeNode(checker.getTypeAtLocation(model), undefined, compiler.NodeBuilderFlags.NoTruncation);
    assert.equal(synthetic.pos, -1);
    assert.equal(compiler.firstToken(synthetic), undefined);
    assert.equal(prettyLocationOfNode(model.name), `At: ${fixture}:4:4.`);
    assert.equal(prettyLocationOfNode({ pos: -1, getSourceFile: () => source }), `At: ${fixture}.`);
  });
  const error = new Error('source lookup failed');
  const node = {
    pos: -1,
    getSourceFile: () => {
      throw error;
    },
  };
  assert.equal(compiler.firstToken(node), undefined);
  assert.equal(prettyLocationOfNode(node), 'At unknown position...');
  assert.throws(() => prettyLocationOfNode({ ...node, pos: 0 }), error);
  const lazySource = {
    pos: -1,
    getSourceFile: () => ({
      get fileName() {
        throw error;
      },
    }),
  };
  assert.equal(prettyLocationOfNode(lazySource), 'At unknown position...');
  assert.throws(() => prettyLocationOfNode({ ...lazySource, pos: 0 }), error);
});

test('normalizeNode preserves optional properties and defaulted type parameters on repeated getSourceFiles calls', async () => {
  const optionalFixture = path.resolve(__dirname, '../fixtures/compiler/optionalPropertyController.ts');
  await compiler.withCompiler(() => {
    const program = compiler.createProgram([optionalFixture], { experimentalDecorators: true });
    for (let visit = 0; visit < 2; visit++) {
      const source = program.getSourceFiles().find(source => source.fileName === optionalFixture);
      const model = source.statements.find(node => node.name?.text === 'OptionalModel');
      assert.equal(model.typeParameters[0].default.kind, compiler.SyntaxKind.StringKeyword);
      assert.equal(model.members[0].questionToken.kind, compiler.SyntaxKind.QuestionToken);
      const classModel = source.statements.find(node => node.name?.text === 'OptionalClassModel');
      assert.equal(classModel.members[0].questionToken.kind, compiler.SyntaxKind.QuestionToken);
      assert.equal(classModel.members[1].questionToken, undefined);
    }
  });
});
