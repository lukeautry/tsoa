import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger, Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Overriding SpecGenerator3 members that take part in union discriminator detection', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts').Generate();
  const defaultConfig = getDefaultOptions();
  const options: ExtendedSpecConfig = { ...defaultConfig.spec, noImplicitAdditionalProperties: 'ignore', entryFile: defaultConfig.entryFile };

  const contentBlock = (generator: SpecGenerator3) => generator.GetSpec().components.schemas!['ContentBlock'] as Swagger.Schema3;

  it('passes the union members without null to getUnionDiscriminator', () => {
    const received: Tsoa.Type[][] = [];
    class Spying extends SpecGenerator3 {
      protected getUnionDiscriminator(types: Tsoa.Type[]) {
        received.push(types);
        return super.getUnionDiscriminator(types);
      }
    }
    new Spying(metadata, options).GetSpec();

    expect(received.length).to.be.greaterThan(0);
    expect(received.flat().filter(t => t.dataType === 'enum' && t.enums.includes(null))).to.deep.equal([]);
  });

  it('honours an overridden isRequiredWithoutDefault', () => {
    class NothingRequired extends SpecGenerator3 {
      protected isRequiredWithoutDefault() {
        return false;
      }
    }

    expect(contentBlock(new SpecGenerator3(metadata, options)).discriminator).to.not.equal(undefined);
    const schema = contentBlock(new NothingRequired(metadata, options));
    expect(schema.discriminator).to.equal(undefined);
    expect(schema.anyOf).to.have.length(3);
  });

  it('honours an overridden hasUndefined', () => {
    class EverythingUndefined extends SpecGenerator3 {
      protected hasUndefined() {
        return true;
      }
    }

    expect(contentBlock(new EverythingUndefined(metadata, options)).discriminator).to.equal(undefined);
  });

  it('honours an overridden isNull', () => {
    class TextIsNull extends SpecGenerator3 {
      protected isNull(type: Tsoa.Type) {
        return type.dataType === 'refObject' && type.refName === 'TextContentBlock';
      }
    }
    const schema = contentBlock(new TextIsNull(metadata, options));

    expect(schema.oneOf).to.deep.equal([{ $ref: '#/components/schemas/ImageContentBlock' }, { $ref: '#/components/schemas/CarouselContentBlock' }]);
    expect(schema.nullable).to.equal(true);
  });

  it('finds no discriminator for a nullable union when isNull never matches', () => {
    class NothingIsNull extends SpecGenerator3 {
      protected isNull() {
        return false;
      }
    }
    const schema = new NothingIsNull(metadata, options).GetSpec().paths['/ComplexType/NullableContentBlockBody'].post!.requestBody!.content['application/json'].schema as Swagger.Schema3;

    expect(schema.discriminator).to.equal(undefined);
    expect(schema.anyOf).to.have.length(4);
  });
});
