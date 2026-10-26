import * as compiler from '@tsoa/cli/compiler';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { prettyLocationOfNode } from '@tsoa/cli/metadataGeneration/exceptions';
import { validateCompilerOptions } from '@tsoa/cli/cli';
import { generateSpec, generateRoutes } from '@tsoa/cli/index';
import { expect } from 'chai';
import 'mocha';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as sinon from 'sinon';
import { version as typescriptVersion } from 'typescript';
import type { Tsoa } from '@tsoa/runtime';

const fixture = path.resolve(__dirname, '../../fixtures/compiler/backendController.ts');

describe('Compiler backends', () => {
  it('compiler selection accepts only typescript and tsrs', () => {
    const before = process.env.TSOA_COMPILER;
    try {
      delete process.env.TSOA_COMPILER;
      expect(compiler.compilerPackage()).to.equal('typescript');
      process.env.TSOA_COMPILER = 'typescript';
      expect(compiler.compilerPackage()).to.equal('typescript');
      process.env.TSOA_COMPILER = 'tsrs';
      expect(compiler.compilerPackage()).to.equal('tsrs');
      process.env.TSOA_COMPILER = 'other';
      expect(() => compiler.compilerPackage()).to.throw(/Unknown TSOA_COMPILER/);
    } finally {
      if (before === undefined) delete process.env.TSOA_COMPILER;
      else process.env.TSOA_COMPILER = before;
    }
  });

  it('async generation reads decorators, JSDoc, parameter tags and conditional aliases', async () => {
    const metadata = await compiler.withCompiler(() => new MetadataGenerator(fixture, { experimentalDecorators: true }).Generate());
    expect(metadata.controllers.length).to.equal(1);
    const method = metadata.controllers[0].methods.find(method => method.name === 'get')!;
    expect(method.description).to.equal('Read a model.');
    expect(method.parameters[0].description).to.equal('The model identifier.');
    expect(method.parameters[0].type.dataType).to.equal('integer');
    expect(metadata.referenceTypeMap.BackendModel.description).to.equal('A compiler fixture.');
    expect((metadata.referenceTypeMap.BackendModel as Tsoa.RefObjectType).properties[0].description).to.equal('A label.');
  });

  it('compiler sessions remove temporary projects after errors', async () => {
    const projects = () =>
      readdirSync(tmpdir())
        .filter(name => name.startsWith('tsoa-compiler-'))
        .sort();
    const before = projects();
    await compiler
      .withCompiler(() => {
        new MetadataGenerator(fixture, { experimentalDecorators: true });
        throw new Error('generation failed');
      })
      .then(
        () => expect.fail('Expected generation to fail'),
        (error: unknown) =>
          expect(error)
            .to.be.instanceOf(Error)
            .and.have.property('message')
            .that.matches(/generation failed/),
      );
    expect(projects()).to.deep.equal(before);
  });

  it('the synchronous entry rejects native backends', () => {
    const before = process.env.TSOA_COMPILER;
    try {
      process.env.TSOA_COMPILER = 'tsrs';
      expect(() => new MetadataGenerator(fixture)).to.throw(/native compilers require an async generation entry point/);
    } finally {
      if (before === undefined) delete process.env.TSOA_COMPILER;
      else process.env.TSOA_COMPILER = before;
    }
  });

  it('the built CommonJS CLI passes tsoa.json compiler options to spec and route generation', () => {
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
              '@tsoa/runtime': [path.resolve(__dirname, '../../../packages/runtime/dist')],
              'compiler-options-model': [fixture],
            },
          },
          spec: { outputDirectory: directory, specVersion: 3.1 },
          routes: { routesDir: directory },
        }),
      );
      const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../packages/cli/dist/cli.js'), 'spec-and-routes', '-c', config], {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 30000,
      });
      expect(result.status, result.stderr).to.equal(0);
      expect(existsSync(path.join(directory, 'swagger.json'))).to.equal(true);
      expect(existsSync(path.join(directory, 'routes.ts'))).to.equal(true);
      const swagger = JSON.parse(readFileSync(path.join(directory, 'swagger.json'), 'utf8'));
      expect(swagger.paths['/compiler-options'].get.responses['200'].content['application/json'].schema.$ref).to.equal('#/components/schemas/BackendModel');
      expect(swagger.components.schemas.BackendModel.properties.label.type).to.equal('string');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('optionalPropertyController preserves optional interface and class properties', async () => {
    const optionalFixture = path.resolve(__dirname, '../../fixtures/compiler/optionalPropertyController.ts');
    const metadata = await compiler.withCompiler(() => new MetadataGenerator(optionalFixture, { experimentalDecorators: true }).Generate());
    expect((metadata.referenceTypeMap.OptionalModel as Tsoa.RefObjectType).properties[0].required).to.equal(false);
    expect((metadata.referenceTypeMap.OptionalClassModel as Tsoa.RefObjectType).properties.map(({ name, required }) => ({ name, required }))).to.deep.equal([
      { name: 'label', required: false },
      { name: 'requiredLabel', required: true },
    ]);
  });

  it('complexTypeController preserves optional properties on compiler-built PaginationQuery nodes', async () => {
    const complexFixture = path.resolve(__dirname, '../../fixtures/controllers/complexTypeController.ts');
    const metadata = await compiler.withCompiler(() => new MetadataGenerator(complexFixture, { experimentalDecorators: true, strictNullChecks: true, skipLibCheck: true }).Generate());
    const method = metadata.controllers[0].methods.find(method => method.name === 'getPaginationQuery')!;
    expect((method.parameters[0].type as Tsoa.NestedObjectLiteralType).properties.map(({ name, required }) => ({ name, required })).sort((a, b) => a.name.localeCompare(b.name))).to.deep.equal([
      { name: 'limit', required: true },
      { name: 'page', required: true },
      { name: 'sortBy', required: false },
      { name: 'sortOrder', required: false },
    ]);
  });

  it('prettyLocationOfNode falls back for synthetic nodes without changing source locations', async () => {
    await compiler.withCompiler(() => {
      const program = compiler.createProgram([fixture], { experimentalDecorators: true });
      const source = program.getSourceFiles().find(source => source.fileName === fixture)!;
      const model = source.statements.find((node): node is compiler.InterfaceDeclaration => compiler.isInterfaceDeclaration(node) && node.name?.text === 'BackendModel')!;
      const checker = program.getTypeChecker();
      const synthetic = checker.typeToTypeNode(checker.getTypeAtLocation(model), undefined, compiler.NodeBuilderFlags.NoTruncation)!;
      expect(synthetic.pos).to.equal(-1);
      expect(compiler.firstToken(synthetic)).to.equal(undefined);
      expect(prettyLocationOfNode(model.name)).to.equal(`At: ${fixture}:4:4.`);
      expect(prettyLocationOfNode({ pos: -1, getSourceFile: () => source } as compiler.Node)).to.equal(`At: ${fixture}.`);
    });
    const error = new Error('source lookup failed');
    const node = {
      pos: -1,
      getSourceFile: () => {
        throw error;
      },
    } as unknown as compiler.Node;
    expect(compiler.firstToken(node)).to.equal(undefined);
    expect(prettyLocationOfNode(node)).to.equal('At unknown position...');
    expect(() => prettyLocationOfNode({ ...node, pos: 0 })).to.throw(error.message);
    const lazySource = {
      pos: -1,
      getSourceFile: () => ({
        get fileName() {
          throw error;
        },
      }),
    } as unknown as compiler.Node;
    expect(prettyLocationOfNode(lazySource)).to.equal('At unknown position...');
    expect(() => prettyLocationOfNode({ ...lazySource, pos: 0 })).to.throw(error.message);
  });

  it('normalizeNode preserves optional properties and defaulted type parameters on repeated getSourceFiles calls', async () => {
    const optionalFixture = path.resolve(__dirname, '../../fixtures/compiler/optionalPropertyController.ts');
    await compiler.withCompiler(() => {
      const program = compiler.createProgram([optionalFixture], { experimentalDecorators: true });
      for (let visit = 0; visit < 2; visit++) {
        const source = program.getSourceFiles().find(source => source.fileName === optionalFixture)!;
        const model = source.statements.find((node): node is compiler.InterfaceDeclaration => compiler.isInterfaceDeclaration(node) && node.name?.text === 'OptionalModel')!;
        expect(model.typeParameters![0].default!.kind).to.equal(compiler.SyntaxKind.StringKeyword);
        expect((model.members[0] as compiler.PropertySignature).questionToken!.kind).to.equal(compiler.SyntaxKind.QuestionToken);
        const classModel = source.statements.find((node): node is compiler.ClassDeclaration => compiler.isClassDeclaration(node) && node.name?.text === 'OptionalClassModel')!;
        expect((classModel.members[0] as compiler.PropertyDeclaration).questionToken!.kind).to.equal(compiler.SyntaxKind.QuestionToken);
        expect((classModel.members[1] as compiler.PropertyDeclaration).questionToken).to.equal(undefined);
      }
    });
  });

  it('generateSpec and generateRoutes render supplied metadata without acquiring a native compiler', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'tsoa-cached-metadata-'));
    const before = process.env.TSOA_COMPILER;
    const acquire = sinon.stub(compiler, 'withCompiler').throws(new Error('Rendering must not acquire a compiler'));
    try {
      process.env.TSOA_COMPILER = 'tsrs';
      const metadata = { controllers: [], referenceTypeMap: {} };
      const config = {
        entryFile: fixture,
        outputDirectory: directory,
        routesDir: directory,
        specVersion: 3.1,
        middleware: 'express',
        bodyCoercion: true,
        noImplicitAdditionalProperties: 'ignore',
      } as const;
      expect(await generateSpec(config, undefined, undefined, metadata)).to.equal(metadata);
      expect(await generateRoutes(config, undefined, undefined, metadata)).to.equal(metadata);
      expect(existsSync(path.join(directory, 'swagger.json'))).to.equal(true);
      expect(existsSync(path.join(directory, 'routes.ts'))).to.equal(true);
    } finally {
      acquire.restore();
      if (before === undefined) delete process.env.TSOA_COMPILER;
      else process.env.TSOA_COMPILER = before;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('validateCompilerOptions rejects an invalid tsconfig with a useful diagnostic', async function () {
    if (compiler.compilerPackage() === 'typescript' && typescriptVersion.startsWith('7.0.')) {
      this.skip();
      return;
    }
    const directory = mkdtempSync(path.join(tmpdir(), 'tsoa-invalid-tsconfig-'));
    try {
      writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'invalid-target' }, files: [fixture] }));
      await compiler.withCompiler(() => {
        expect(() => validateCompilerOptions(undefined, directory)).to.throw(/Argument for '--target' option must be/);
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('typeRootsController resolves relative typeRoots overrides from the original working directory', async () => {
    const entryFile = path.resolve(__dirname, '../../fixtures/compiler/typeRootsController.ts');
    const metadata = await compiler.withCompiler(() =>
      new MetadataGenerator(entryFile, {
        experimentalDecorators: true,
        typeRoots: [path.relative(process.cwd(), path.resolve(__dirname, '../../fixtures/compiler/typings'))],
        types: ['type-roots-model'],
      }).Generate(),
    );
    expect((metadata.controllers[0].methods[0].type as Tsoa.RefObjectType).refName).to.equal('TypeRootsModel');
    expect((metadata.referenceTypeMap.TypeRootsModel as Tsoa.RefObjectType).properties[0].name).to.equal('label');
    expect((metadata.referenceTypeMap.TypeRootsModel as Tsoa.RefObjectType).properties[0].type.dataType).to.equal('string');
  });
});
