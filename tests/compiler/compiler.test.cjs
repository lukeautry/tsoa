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

test('the built CommonJS CLI generates spec and routes with the selected peer', () => {
  const { mkdtempSync, writeFileSync, existsSync, rmSync } = require('node:fs');
  const { spawnSync } = require('node:child_process');
  const directory = mkdtempSync(path.join(tmpdir(), 'tsoa-cli-test-'));
  try {
    const config = path.join(directory, 'tsoa.json');
    writeFileSync(
      config,
      JSON.stringify({
        entryFile: fixture,
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
