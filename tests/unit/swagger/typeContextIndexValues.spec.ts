import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const entryFile = './fixtures/controllers/typeContextIndexValuesController.ts';
const directEntryFile = './fixtures/controllers/typeContextIndexValuesDirectController.ts';

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

describe('Explicit index values in computed type contexts', () => {
  for (const strictNullChecks of [false, true]) {
    describe(`strictNullChecks=${strictNullChecks}`, () => {
      const metadata = new MetadataGenerator(entryFile, { strictNullChecks }).Generate();
      const directMetadata = new MetadataGenerator(directEntryFile, { strictNullChecks }).Generate();
      const alias = required(metadata.referenceTypeMap['Record_string.any_'], 'Record alias');
      const directAlias = required(directMetadata.referenceTypeMap['Record_string.any_'], 'direct Record alias');

      it('uses the fixture without TypeScript diagnostics', () => {
        const program = createProgram([entryFile, directEntryFile], {
          strictNullChecks,
          experimentalDecorators: true,
          target: ScriptTarget.ES2021,
          module: ModuleKind.CommonJS,
          skipLibCheck: true,
          noEmit: true,
        });
        expect(getPreEmitDiagnostics(program).map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      it('keeps any as an inferred Zod Record value in metadata and emits an open object schema', () => {
        if (alias.dataType !== 'refAlias') {
          throw new Error('Expected the Record alias to resolve as an alias');
        }
        expect(alias.type.dataType).to.equal('nestedObjectLiteral');
        if (alias.type.dataType !== 'nestedObjectLiteral') {
          throw new Error('Expected a nested object alias body');
        }
        expect(alias.type.properties).to.deep.equal([]);
        expect(alias.type.additionalProperties).to.deep.equal({ dataType: 'any' });
        if (directAlias.dataType !== 'refAlias' || directAlias.type.dataType !== 'nestedObjectLiteral') {
          throw new Error('Expected the direct Record alias to keep its object value type');
        }
        expect(directAlias.type.additionalProperties).to.deep.equal({ dataType: 'any' });

        const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
        const directSpec = new SpecGenerator3(directMetadata, getDefaultExtendedOptions()).GetSpec();
        if (spec.openapi !== '3.0.0' || directSpec.openapi !== '3.0.0') {
          throw new Error('Expected OpenAPI 3.0 specifications');
        }
        const schemas = required(spec.components.schemas, 'component schemas');
        const resolve = (schema: Swagger.Schema3 | undefined): Swagger.Schema3 => {
          const value = required(schema, 'schema');
          if (!value.$ref) {
            return value;
          }
          const name = value.$ref.replace('#/components/schemas/', '');
          return resolve(required(schemas[name], name));
        };
        const request = resolve(spec.paths['/IndexValues/values']?.post?.requestBody?.content?.['application/json']?.schema);
        const response = resolve(spec.paths['/IndexValues/values']?.post?.responses['200'].content?.['application/json']?.schema);
        expect(resolve(request.properties?.values).additionalProperties).to.deep.equal({});
        expect(resolve(response.properties?.values).additionalProperties).to.deep.equal({});

        const directSchemas = required(directSpec.components.schemas, 'direct component schemas');
        const resolveDirect = (schema: Swagger.Schema3 | undefined): Swagger.Schema3 => {
          const value = required(schema, 'direct schema');
          if (!value.$ref) {
            return value;
          }
          const name = value.$ref.replace('#/components/schemas/', '');
          return resolveDirect(required(directSchemas[name], name));
        };
        const directRequest = resolveDirect(directSpec.paths['/DirectIndexValues/values']?.post?.requestBody?.content?.['application/json']?.schema);
        const directResponse = resolveDirect(directSpec.paths['/DirectIndexValues/values']?.post?.responses['200'].content?.['application/json']?.schema);
        expect(directRequest.additionalProperties).to.deep.equal({});
        expect(directResponse.additionalProperties).to.deep.equal({});
      });
    });
  }
});
