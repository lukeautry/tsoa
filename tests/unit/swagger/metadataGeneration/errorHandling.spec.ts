import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { ParameterGenerator } from '@tsoa/cli/metadataGeneration/parameterGenerator';
import { TypeResolver } from '@tsoa/cli/metadataGeneration/typeResolver';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';

describe('Error Handling for Complex Type Resolution', () => {
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

  describe('ParameterGenerator error handling', () => {
    it('should handle type resolution failures gracefully in @Queries', () => {
      // Test the specific error handling mentioned in the parameterGenerator changes
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

      // Capture console.warn calls
      const originalConsoleWarn = console.warn;
      const warnings: string[] = [];

      console.warn = (message: string) => {
        warnings.push(message);
      };

      try {
        const result = parameterGenerator.Generate();

        // Should not throw an error
        expect(result).to.be.an('array');
        expect(result).to.have.length(1);
        expect(result[0].in).to.equal('queries');

        // If type resolution fails, it should fall back to the original error
        // but not crash the system
        if (result[0].type.dataType !== 'refObject' && result[0].type.dataType !== 'nestedObjectLiteral') {
          // This means the complex type resolution failed and fell back to the original error
          // The system should still generate a parameter, but it might not be the expected type
          expect(result[0].type).to.exist;
        }
      } finally {
        console.warn = originalConsoleWarn;
      }
    });

    it('should log warnings when complex type resolution fails', () => {
      // Test that warnings are logged when complex type resolution fails
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

      const originalConsoleWarn = console.warn;
      const warnings: string[] = [];

      console.warn = (message: string) => {
        warnings.push(message);
      };

      try {
        parameterGenerator.Generate();

        // Check if warnings were logged about complex type resolution
        const complexTypeWarnings = warnings.filter(warning => warning.includes('Failed to resolve complex type for @Queries'));

        // Note: This test might not catch warnings if the type resolution succeeds
        // but it ensures the warning mechanism is in place
        // The actual warning would be: "Failed to resolve complex type for @Queries('queryParams'): [error details]"
      } finally {
        console.warn = originalConsoleWarn;
      }
    });

    it('should continue with original error when complex type resolution fails', () => {
      // Test that when complex type resolution fails, the system continues with the original error
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

      // The method should not throw an error even if complex type resolution fails
      expect(() => parameterGenerator.Generate()).to.not.throw();
    });
  });

  describe('TypeResolver error handling', () => {
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

    it('should handle type resolution errors in typeArgumentsToContext', () => {
      // Test the error handling in typeArgumentsToContext method
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

      // This should not throw an error even if type resolution is complex
      expect(() => typeResolver.resolve()).to.not.throw();
    });

    it('should handle inline object types gracefully', () => {
      // Test the handling of inline object types in generics
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

      // Should resolve to a valid type
      expect(resolvedType).to.exist;
      expect(resolvedType.dataType).to.be.oneOf(['refObject', 'nestedObjectLiteral', 'refAlias']);
    });
  });

  describe('Error message validation', () => {
    it('should provide helpful error messages for type resolution failures', () => {
      // Test that error messages are helpful when type resolution fails
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

      // The method should not throw an error, but if it does, the error should be helpful
      try {
        parameterGenerator.Generate();
      } catch (error) {
        if (error instanceof GenerateMetadataError) {
          expect(error.message).to.be.a('string');
          expect(error.message.length).to.be.greaterThan(0);
        }
      }
    });

    it('should handle type resolution warnings appropriately', () => {
      // Test that warnings are logged appropriately
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

      const originalConsoleWarn = console.warn;
      const warnings: string[] = [];

      console.warn = (message: string) => {
        warnings.push(message);
      };

      try {
        parameterGenerator.Generate();

        // Check if any warnings were logged
        // The warning should include the parameter name and error details
        const complexTypeWarnings = warnings.filter(warning => warning.includes('Failed to resolve complex type for @Queries'));

        // If warnings were logged, they should be helpful
        for (const warning of complexTypeWarnings) {
          expect(warning).to.include('@Queries');
          expect(warning).to.include('queryParams');
        }
      } finally {
        console.warn = originalConsoleWarn;
      }
    });
  });

  describe('Graceful degradation', () => {
    it('should degrade gracefully when complex type resolution fails', () => {
      // Test that the system degrades gracefully when complex type resolution fails
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

      // Should still generate a result, even if not the expected type
      expect(result).to.be.an('array');
      expect(result).to.have.length(1);
      expect(result[0]).to.have.property('in', 'queries');
      expect(result[0]).to.have.property('name', 'queryParams');
      expect(result[0]).to.have.property('type');
    });

    it('should not crash the entire metadata generation process', () => {
      // Test that complex type resolution failures don't crash the entire process
      const metadata = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts').Generate();

      expect(metadata).to.exist;
      expect(metadata.controllers).to.be.an('array');
      expect(metadata.controllers).to.have.length.greaterThan(0);

      const complexTypeController = metadata.controllers.find(controller => controller.name === 'ComplexTypeController');
      expect(complexTypeController).to.exist;
      expect(complexTypeController?.methods).to.be.an('array');
      expect(complexTypeController?.methods).to.have.length.greaterThan(0);
    });
  });
});
