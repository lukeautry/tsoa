import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const fixtureRoot = './fixtures/controllers/typeContextGroups/';
const fixtureNames = ['repeated', 'conditional'];

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function generate(name: string, strictNullChecks: boolean) {
  const metadata = new MetadataGenerator(`${fixtureRoot}${name}Controller.ts`, { strictNullChecks }).Generate();
  const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
  if (spec.openapi !== '3.0.0') {
    throw new Error('Expected an OpenAPI 3.0 specification');
  }
  const schemas = required(spec.components.schemas, 'component schemas');
  const responseSchema = required(spec.paths['/group']?.post?.responses['200'].content?.['application/json'].schema, 'response schema');
  const response = responseSchema.$ref ? required(schemas[responseSchema.$ref.replace('#/components/schemas/', '')], responseSchema.$ref) : responseSchema;
  return { response, schemas };
}

function expectOptionalProperties(schema: Swagger.Schema3, properties: Record<string, string>) {
  expect(schema.properties, 'mapped properties').to.have.all.keys(Object.keys(properties));
  for (const [name, type] of Object.entries(properties)) {
    expect(schema.properties?.[name].type, name).to.equal(type);
  }
  expect(schema.required, 'mapped properties stay optional').to.equal(undefined);
}

function expectSchemaReference(schema: Swagger.Schema3 | undefined, name: string) {
  expect(required(schema, name).$ref).to.equal(`#/components/schemas/${name}`);
}

describe('Type context in named generic groups', () => {
  for (const strictNullChecks of [false, true]) {
    describe(`strictNullChecks=${strictNullChecks}`, () => {
      it('uses both fixtures without TypeScript diagnostics', () => {
        const program = createProgram(
          fixtureNames.map(name => `${fixtureRoot}${name}Controller.ts`),
          { strictNullChecks, experimentalDecorators: true, target: ScriptTarget.ES2021, module: ModuleKind.CommonJS, skipLibCheck: true, noEmit: true },
        );
        expect(getPreEmitDiagnostics(program).map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      it('keeps repeated named Group branches in order and populates each mapped branch', () => {
        const { response, schemas } = generate('repeated', strictNullChecks);
        const value = required(response.properties?.value, 'value');
        expect(value.anyOf).to.deep.equal([{ type: 'number', format: 'double' }, { $ref: '#/components/schemas/Group_Left.Left_' }, { $ref: '#/components/schemas/Group_Right.Right_' }]);
        expect(value.nullable).to.equal(strictNullChecks ? true : undefined);

        const left = required(schemas['Group_Left.Left_']?.anyOf, 'left Group branches');
        expectSchemaReference(left[0], 'Left');
        expectOptionalProperties(required(left[1], 'left mapped branch'), { left: 'string' });

        const right = required(schemas['Group_Right.Right_']?.anyOf, 'right Group branches');
        expectSchemaReference(right[0], 'Right');
        expectOptionalProperties(required(right[1], 'right mapped branch'), { right: 'number' });
      });

      it('generates a conditional generic Group with its populated Optional branch', () => {
        const { response, schemas } = generate('conditional', strictNullChecks);
        const value = required(response.properties?.value, 'value');
        expect(value.anyOf).to.deep.equal([{ type: 'number', format: 'double' }, { $ref: '#/components/schemas/Group_Left.Left_' }]);
        expect(value.nullable).to.equal(strictNullChecks ? true : undefined);

        const group = required(schemas['Group_Left.Left_']?.anyOf, 'Group branches');
        expectSchemaReference(group[0], 'Left');
        expectSchemaReference(group[1], 'Optional_Left_');
        expectOptionalProperties(required(schemas.Optional_Left_, 'Optional schema'), { left: 'string' });
      });
    });
  }
});
