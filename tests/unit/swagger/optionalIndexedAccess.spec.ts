import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { FieldErrors, Swagger, ValidationService } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { CompilerOptions, createProgram, flattenDiagnosticMessageText } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

/**
 * `Source['inner']` with an optional `inner?: Inner` is `Inner | undefined` under strictNullChecks.
 * The declared `Inner` names the model; the `undefined` is the optionality, and the model is the
 * same one `Inner` written directly refers to.
 */
describe('Indexed access to optional properties', () => {
  const entryFile = './fixtures/optionalIndexedAccess/optionalIndexedAccessController.ts';
  const variants: Array<{ name: string; compilerOptions: CompilerOptions; strictNullChecks: boolean }> = [
    { name: 'strict false', compilerOptions: { strict: false }, strictNullChecks: false },
    { name: 'strict true', compilerOptions: { strict: true }, strictNullChecks: true },
    { name: 'exactOptionalPropertyTypes', compilerOptions: { strict: true, exactOptionalPropertyTypes: true }, strictNullChecks: true },
  ];

  for (const { name, compilerOptions, strictNullChecks } of variants) {
    describe(name, () => {
      const options = { ...compilerOptions, experimentalDecorators: true, skipLibCheck: true, types: [], lib: ['lib.es2021.d.ts'] };
      const diagnostics = createProgram([entryFile], options).getSemanticDiagnostics();
      const metadata = new MetadataGenerator(entryFile, options).Generate();
      const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions('', entryFile)).GetSpec();
      const schemas = JSON.parse(JSON.stringify(spec.components.schemas!)) as Record<string, Swagger.Schema3>;
      const models = new DefaultRouteGenerator(metadata, { entryFile, routesDir: './fixtures', noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).buildModels();
      const validate = (value: unknown) => {
        const errors: FieldErrors = {};
        new ValidationService(models, { bodyCoercion: false, noImplicitAdditionalProperties: 'ignore' }).ValidateParam({ ref: 'IndexedAccess', required: true }, value, 'body', errors, true);
        return Object.keys(errors);
      };
      const ref = (model: string) => ({ $ref: `#/components/schemas/${model}` });

      it('type-checks the fixture', () => {
        expect(diagnostics.map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      it('refers to the declared model, the same one a direct use refers to', () => {
        const properties = schemas.IndexedAccess.properties!;
        expect(properties.direct).to.deep.equal(ref('Inner'));
        expect(properties.viaIndex).to.deep.equal(ref('Inner'));
        expect(properties.requiredViaIndex).to.deep.equal(ref('Inner'));
        expect(properties.id).to.deep.equal(ref('Identifier'));
        expect(properties.idViaIndex).to.deep.equal(ref('Identifier'));
        expect(properties.maybe).to.deep.equal(ref('Maybe'));
        expect(properties.maybeViaIndex).to.deep.equal(ref('Maybe'));
        expect(properties.elements).to.deep.equal({ type: 'array', items: ref('Inner') });
        expect(properties.list).to.deep.equal({ type: 'array', items: ref('Inner') });
        expect(properties.boxed).to.deep.equal(ref('Box_Source-at-inner_'));
        expect(schemas['Box_Source-at-inner_'].properties!.value).to.deep.equal(ref('Inner'));
      });

      it('builds models from the declared type, without the undefined of optionality', () => {
        expect(schemas.Inner.properties).to.deep.equal({ a: { type: 'string' } });
        expect(schemas.Identifier).to.deep.equal({ type: 'string', pattern: '^x' });
        // An alias reached only through indexed access keeps its body (it must not refer to itself).
        expect(schemas.InnerAlias).to.deep.equal({ properties: { b: { type: 'string' } }, type: 'object' });
        expect(schemas.IndexedAccess.properties!.aliasViaIndex).to.deep.equal(ref('InnerAlias'));
      });

      it('requires properties whose type admits undefined only without strictNullChecks', () => {
        // With strictNullChecks, `Source['inner']` admits undefined, as a written `Inner | undefined` does.
        const required = strictNullChecks ? ['id'] : ['requiredViaIndex', 'id', 'idViaIndex', 'aliasViaIndex'];
        expect(schemas.IndexedAccess.required).to.deep.equal(required);
        expect(validate({ id: 'xenon' }).length === 0).to.equal(strictNullChecks);
      });

      it('validates values against the declared model', () => {
        const valid = { requiredViaIndex: {}, id: 'xenon', idViaIndex: 'xylophone', aliasViaIndex: {} };
        expect(validate(valid)).to.deep.equal([]);
        expect(validate({ ...valid, idViaIndex: 'zinc' })).to.deep.equal(['body.idViaIndex']);
        // Under strictNullChecks the error is reported on the union `Inner | undefined`, as for a written one.
        expect(validate({ ...valid, viaIndex: { a: 7 } })).to.deep.equal([strictNullChecks ? 'body.viaIndex' : 'body.viaIndex.a']);
      });
    });
  }
});
