import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { ParameterGenerator } from '@tsoa/cli/metadataGeneration/parameterGenerator';
import { Tsoa } from '@tsoa/runtime';

describe('ParameterGenerator - Complex Type Resolution', () => {
  let metadataGenerator: MetadataGenerator;
  let program: ts.Program;
  let sourceFile: ts.SourceFile;

  before(() => {
    // Create a test program with the complex type controller
    const testFiles = ['./fixtures/controllers/complexTypeController.ts'];
    program = ts.createProgram(testFiles, {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    });

    const sourceFileResult = program.getSourceFile('./fixtures/controllers/complexTypeController.ts');
    if (!sourceFileResult) {
      throw new Error('Could not find source file');
    }
    sourceFile = sourceFileResult;

    metadataGenerator = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts');
  });

  describe('@Queries with z.infer types', () => {
    it('should resolve z.infer<UserSchema> type correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getZodUserQueries');

      if (!method) {
        throw new Error('Could not find getZodUserQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/ZodUserQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);

      if (result[0].type.dataType === 'refObject') {
        const refType = result[0].type;
        expect(refType.properties).to.be.an('array');
        expect(refType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from UserSchema
        const propertyNames = refType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('name');
        expect(propertyNames).to.include('email');
        expect(propertyNames).to.include('age');
        expect(propertyNames).to.include('isActive');
        expect(propertyNames).to.include('tags');
        expect(propertyNames).to.include('metadata');
      } else if (result[0].type.dataType === 'nestedObjectLiteral') {
        const nestedType = result[0].type;
        expect(nestedType.properties).to.be.an('array');
        expect(nestedType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from UserSchema
        const propertyNames = nestedType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('name');
        expect(propertyNames).to.include('email');
        expect(propertyNames).to.include('age');
        expect(propertyNames).to.include('isActive');
        expect(propertyNames).to.include('tags');
        expect(propertyNames).to.include('metadata');
      }
    });

    it('should resolve z.infer<ProductSchema> type correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getZodProductQueries');

      if (!method) {
        throw new Error('Could not find getZodProductQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/ZodProductQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);

      if (result[0].type.dataType === 'refObject') {
        const refType = result[0].type;
        expect(refType.properties).to.be.an('array');
        expect(refType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from ProductSchema
        const propertyNames = refType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('title');
        expect(propertyNames).to.include('price');
        expect(propertyNames).to.include('category');
        expect(propertyNames).to.include('inStock');
        expect(propertyNames).to.include('specifications');
      } else if (result[0].type.dataType === 'nestedObjectLiteral') {
        const nestedType = result[0].type;
        expect(nestedType.properties).to.be.an('array');
        expect(nestedType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from ProductSchema
        const propertyNames = nestedType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('title');
        expect(propertyNames).to.include('price');
        expect(propertyNames).to.include('category');
        expect(propertyNames).to.include('inStock');
        expect(propertyNames).to.include('specifications');
      }
    });

    it('should resolve z.infer<OrderSchema> type correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getZodOrderQueries');

      if (!method) {
        throw new Error('Could not find getZodOrderQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/ZodOrderQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);

      if (result[0].type.dataType === 'refObject') {
        const refType = result[0].type;
        expect(refType.properties).to.be.an('array');
        expect(refType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from OrderSchema
        const propertyNames = refType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('userId');
        expect(propertyNames).to.include('products');
        expect(propertyNames).to.include('total');
        expect(propertyNames).to.include('status');
        expect(propertyNames).to.include('createdAt');
        expect(propertyNames).to.include('updatedAt');
      } else if (result[0].type.dataType === 'nestedObjectLiteral') {
        const nestedType = result[0].type;
        expect(nestedType.properties).to.be.an('array');
        expect(nestedType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from OrderSchema
        const propertyNames = nestedType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('userId');
        expect(propertyNames).to.include('products');
        expect(propertyNames).to.include('total');
        expect(propertyNames).to.include('status');
        expect(propertyNames).to.include('createdAt');
        expect(propertyNames).to.include('updatedAt');
      }
    });
  });

  describe('@Queries with generic types', () => {
    it('should resolve GenericWrapper type correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getGenericQueries');

      if (!method) {
        throw new Error('Could not find getGenericQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/GenericQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);

      if (result[0].type.dataType === 'refObject') {
        const refType = result[0].type;
        expect(refType.properties).to.be.an('array');
        expect(refType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from GenericWrapper
        const propertyNames = refType.properties.map(p => p.name);
        expect(propertyNames).to.include('data');
        expect(propertyNames).to.include('metadata');
      } else if (result[0].type.dataType === 'nestedObjectLiteral') {
        const nestedType = result[0].type;
        expect(nestedType.properties).to.be.an('array');
        expect(nestedType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from GenericWrapper
        const propertyNames = nestedType.properties.map(p => p.name);
        expect(propertyNames).to.include('data');
        expect(propertyNames).to.include('metadata');
      }
    });

    it('should resolve NestedGeneric type correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getNestedGenericQueries');

      if (!method) {
        throw new Error('Could not find getNestedGenericQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/NestedGenericQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);

      if (result[0].type.dataType === 'refObject') {
        const refType = result[0].type;
        expect(refType.properties).to.be.an('array');
        expect(refType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from NestedGeneric
        const propertyNames = refType.properties.map(p => p.name);
        expect(propertyNames).to.include('first');
        expect(propertyNames).to.include('second');
        expect(propertyNames).to.include('combined');
      } else if (result[0].type.dataType === 'nestedObjectLiteral') {
        const nestedType = result[0].type;
        expect(nestedType.properties).to.be.an('array');
        expect(nestedType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from NestedGeneric
        const propertyNames = nestedType.properties.map(p => p.name);
        expect(propertyNames).to.include('first');
        expect(propertyNames).to.include('second');
        expect(propertyNames).to.include('combined');
      }
    });
  });

  describe('@Queries with advanced TypeScript types', () => {
    it('should resolve ConditionalType correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getConditionalTypeQueries');

      if (!method) {
        throw new Error('Could not find getConditionalTypeQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/ConditionalTypeQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);
    });

    it('should resolve MappedType correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getMappedTypeQueries');

      if (!method) {
        throw new Error('Could not find getMappedTypeQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/MappedTypeQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);
    });

    it('should resolve union types correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getUnionTypeQueries');

      if (!method) {
        throw new Error('Could not find getUnionTypeQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/UnionTypeQueries', metadataGenerator);

      const result = parameterGenerator.Generate();

      expect(result).to.have.length(1);
      expect(result[0].in).to.equal('queries');
      expect(result[0].type.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral']);

      if (result[0].type.dataType === 'refObject') {
        const refType = result[0].type;
        expect(refType.properties).to.be.an('array');
        expect(refType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from Task
        const propertyNames = refType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('title');
        expect(propertyNames).to.include('status');
        expect(propertyNames).to.include('priority');
        expect(propertyNames).to.include('assignee');
        expect(propertyNames).to.include('dueDate');
      } else if (result[0].type.dataType === 'nestedObjectLiteral') {
        const nestedType = result[0].type;
        expect(nestedType.properties).to.be.an('array');
        expect(nestedType.properties).to.have.length.greaterThan(0);

        // Check for expected properties from Task
        const propertyNames = nestedType.properties.map(p => p.name);
        expect(propertyNames).to.include('id');
        expect(propertyNames).to.include('title');
        expect(propertyNames).to.include('status');
        expect(propertyNames).to.include('priority');
        expect(propertyNames).to.include('assignee');
        expect(propertyNames).to.include('dueDate');
      }
    });
  });

  describe('Error handling for complex types', () => {
    it('should handle type resolution failures gracefully', () => {
      // This test ensures that when type resolution fails, the system doesn't crash
      // and provides appropriate error messages
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getZodUserQueries');

      if (!method) {
        throw new Error('Could not find getZodUserQueries method');
      }

      const parameter = method.parameters[0];
      const parameterGenerator = new ParameterGenerator(parameter, 'get', '/ComplexType/ZodUserQueries', metadataGenerator);

      // The method should not throw an error even if type resolution is complex
      expect(() => parameterGenerator.Generate()).to.not.throw();
    });
  });
});
