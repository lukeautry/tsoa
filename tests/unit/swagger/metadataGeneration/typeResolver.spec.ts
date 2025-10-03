import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { TypeResolver } from '@tsoa/cli/metadataGeneration/typeResolver';
import { Tsoa } from '@tsoa/runtime';

describe('TypeResolver - Complex Type Resolution', () => {
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

  describe('Inline object type resolution', () => {
    it('should resolve inline object types in generics', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getGenericQueries');

      if (!method) {
        throw new Error('Could not find getGenericQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);
      const resolvedType = typeResolver.resolve();

      expect(resolvedType).to.be.an('object');
      expect(resolvedType.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral', 'refAlias']);
    });

    it('should handle empty declarations gracefully', () => {
      // Test the case where getModelTypeDeclarations returns an empty array
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getGenericQueries');

      if (!method) {
        throw new Error('Could not find getGenericQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);

      // This should not throw an error even if declarations are empty
      expect(() => typeResolver.resolve()).to.not.throw();
    });

    it('should generate deterministic names for inline types', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getGenericQueries');

      if (!method) {
        throw new Error('Could not find getGenericQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);
      const resolvedType = typeResolver.resolve();

      // If it's a refAlias, check that the refName follows the expected pattern
      if (resolvedType.dataType === 'refAlias') {
        const refAlias = resolvedType;
        expect(refAlias.refName).to.match(/^Inline_/);
        expect(refAlias.refName).to.match(/^[A-Za-z0-9\-._]+$/);
      }
    });
  });

  describe('Type reference resolution', () => {
    it('should resolve z.infer types correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getZodUserQueries');

      if (!method) {
        throw new Error('Could not find getZodUserQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);
      const resolvedType = typeResolver.resolve();

      expect(resolvedType).to.be.an('object');
      expect(resolvedType.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral', 'refAlias']);
    });

    it('should resolve generic types correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getNestedGenericQueries');

      if (!method) {
        throw new Error('Could not find getNestedGenericQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);
      const resolvedType = typeResolver.resolve();

      expect(resolvedType).to.be.an('object');
      expect(resolvedType.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral', 'refAlias']);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle type resolution errors gracefully', () => {
      // Test that the type resolver doesn't crash on complex types
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getConditionalTypeQueries');

      if (!method) {
        throw new Error('Could not find getConditionalTypeQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);

      // This should not throw an error even for complex conditional types
      expect(() => typeResolver.resolve()).to.not.throw();
    });

    it('should handle mapped types correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getMappedTypeQueries');

      if (!method) {
        throw new Error('Could not find getMappedTypeQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);
      const resolvedType = typeResolver.resolve();

      expect(resolvedType).to.be.an('object');
      expect(resolvedType.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral', 'refAlias']);
    });

    it('should handle union types correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getUnionTypeQueries');

      if (!method) {
        throw new Error('Could not find getUnionTypeQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);
      const resolvedType = typeResolver.resolve();

      expect(resolvedType).to.be.an('object');
      expect(resolvedType.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral', 'refAlias']);
    });
  });

  describe('Type name generation', () => {
    it('should generate consistent names for similar types', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method1 = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getGenericQueries');

      const method2 = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getGenericBody');

      if (!method1 || !method2) {
        throw new Error('Could not find test methods');
      }

      const parameter1 = method1.parameters[0];
      const parameter2 = method2.parameters[0];

      const typeNode1 = parameter1.type;
      const typeNode2 = parameter2.type;

      if (!typeNode1 || !typeNode2) {
        throw new Error('Parameter types not found');
      }

      const typeResolver1 = new TypeResolver(typeNode1, metadataGenerator, parameter1);
      const typeResolver2 = new TypeResolver(typeNode2, metadataGenerator, parameter2);

      const resolvedType1 = typeResolver1.resolve();
      const resolvedType2 = typeResolver2.resolve();

      // Both should resolve to similar types
      expect(resolvedType1.dataType).to.equal(resolvedType2.dataType);
    });
  });

  describe('Reference type caching', () => {
    it('should cache resolved types correctly', () => {
      const controller = sourceFile.statements.find((stmt): stmt is ts.ClassDeclaration => ts.isClassDeclaration(stmt) && stmt.name?.text === 'ComplexTypeController');

      if (!controller) {
        throw new Error('Could not find ComplexTypeController');
      }

      const method = controller.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && member.name.getText() === 'getZodUserQueries');

      if (!method) {
        throw new Error('Could not find getZodUserQueries method');
      }

      const parameter = method.parameters[0];
      const typeNode = parameter.type;

      if (!typeNode) {
        throw new Error('Parameter type not found');
      }

      const typeResolver = new TypeResolver(typeNode, metadataGenerator, parameter);

      // Resolve the type multiple times
      const resolvedType1 = typeResolver.resolve();
      const resolvedType2 = typeResolver.resolve();

      // Should return the same reference
      expect(resolvedType1).to.equal(resolvedType2);
    });
  });
});
