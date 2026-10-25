import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';

// The tests project typechecks this file, so these objects fail to compile if the discriminator typings regress.
describe('Swagger discriminator typings', () => {
  it('types the discriminator as a property name in OpenAPI 2.0 schemas', () => {
    const response: Swagger.Response = { description: 'ok', schema: { type: 'object', discriminator: 'kind' } };
    const schema2: Swagger.Schema2 = { type: 'array', items: { discriminator: 'kind' } };

    expect(response.schema?.discriminator).to.equal('kind');
    expect(schema2.items?.discriminator).to.equal('kind');
  });

  it('types the discriminator as an object in OpenAPI 3.x schemas', () => {
    const schema3: Swagger.Schema3 = { type: 'object', discriminator: { propertyName: 'kind', mapping: { a: '#/components/schemas/A' } } };
    const schema31: Swagger.Schema31 = { type: 'object', discriminator: { propertyName: 'kind', mapping: { a: '#/components/schemas/A' } } };

    expect(schema3.discriminator?.propertyName).to.equal('kind');
    expect(schema31.discriminator?.mapping).to.deep.equal({ a: '#/components/schemas/A' });
  });

  it('keeps each version to its own form of the discriminator', () => {
    // @ts-expect-error OpenAPI 2.0 declares the discriminator as a property name.
    const schema2: Swagger.Schema2 = { discriminator: { propertyName: 'kind' } };
    // @ts-expect-error OpenAPI 3.x declares the discriminator as an object.
    const schema3: Swagger.Schema3 = { discriminator: 'kind' };

    expect(schema2.discriminator).to.deep.equal({ propertyName: 'kind' });
    expect(schema3.discriminator).to.equal('kind');
  });
});
