import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

// `@example 0`, `@example false` and `@example ""` used to be dropped as falsy (#1071).
describe('falsy @example values', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/falsyExampleController.ts').Generate();

  it('keeps them in OpenAPI 2 definitions', () => {
    const definitions = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec().definitions!;

    expect(definitions['SkipNumber'].example).to.eq(0);
    expect(definitions['Flag'].example).to.eq(false);
    expect(definitions['Note'].example).to.eq('');
    expect(definitions['Level'].example).to.eq(0);
  });

  it('keeps them in OpenAPI 3 schemas', () => {
    const schemas = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec().components.schemas!;

    expect(schemas['SkipNumber'].example).to.eq(0);
    expect(schemas['Flag'].example).to.eq(false);
    expect(schemas['Note'].example).to.eq('');
    expect(schemas['Level'].example).to.eq(0);
  });
});
