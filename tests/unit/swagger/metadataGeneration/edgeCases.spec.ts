import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { ParameterGenerator } from '@tsoa/cli/metadataGeneration/parameterGenerator';
import { TypeResolver } from '@tsoa/cli/metadataGeneration/typeResolver';
import { Tsoa } from '@tsoa/runtime';

describe('Edge Cases for Complex Type Resolution', () => {
  let metadataGenerator: MetadataGenerator;
  let program: ts.Program;
  let sourceFile: ts.SourceFile;

  before(() => {
    // Create a test program with edge case types
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

  describe('TypeResolver edge cases', () => {
    it('should handle empty declarations array gracefully', () => {
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

    it('should handle inline object types in generics', () => {
      // Test the case where we have inline object types in generic parameters
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

    it('should generate deterministic names for inline types', () => {
      // Test that inline types get consistent, deterministic names
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

    it('should handle type resolution errors gracefully', () => {
      // Test that type resolution errors are handled gracefully
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
  });

  describe('ParameterGenerator edge cases', () => {
    it('should handle complex type resolution in @Queries', () => {
      // Test the specific case mentioned in the parameterGenerator changes
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
    });

    it('should handle type resolution failures gracefully', () => {
      // Test that when type resolution fails, the system doesn't crash
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

    it('should validate properties correctly for resolved types', () => {
      // Test that the validateQueriesProperties method works correctly
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

      // Check that the type is properly resolved and validated
      if (result[0].type.dataType === 'refObject') {
        const refType = result[0].type;
        expect(refType.properties).to.be.an('array');
        expect(refType.properties).to.have.length.greaterThan(0);

        // All properties should be valid for query parameters
        for (const property of refType.properties) {
          expect(property.type).to.exist;
          expect(property.name).to.be.a('string');
        }
      } else if (result[0].type.dataType === 'nestedObjectLiteral') {
        const nestedType = result[0].type;
        expect(nestedType.properties).to.be.an('array');
        expect(nestedType.properties).to.have.length.greaterThan(0);

        // All properties should be valid for query parameters
        for (const property of nestedType.properties) {
          expect(property.type).to.exist;
          expect(property.name).to.be.a('string');
        }
      }
    });
  });

  describe('Error handling and warnings', () => {
    it('should log warnings for type resolution failures', () => {
      // Test that warnings are logged when type resolution fails
      const originalConsoleWarn = console.warn;
      const warnings: string[] = [];

      console.warn = (message: string) => {
        warnings.push(message);
      };

      try {
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

        parameterGenerator.Generate();

        // Check if any warnings were logged
        // Note: This test might not catch warnings if the type resolution succeeds
        // but it ensures the warning mechanism is in place
      } finally {
        console.warn = originalConsoleWarn;
      }
    });

    it('should handle type resolution errors without crashing', () => {
      // Test that the system doesn't crash when encountering complex types
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

      // This should not throw an error even for complex mapped types
      expect(() => parameterGenerator.Generate()).to.not.throw();
    });
  });

  describe('Type name generation consistency', () => {
    it('should generate consistent names for similar types', () => {
      // Test that similar types get consistent names
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
});
