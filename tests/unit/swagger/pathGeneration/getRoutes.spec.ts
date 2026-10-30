import { knownLimit } from '../../../utils/knownLimit';
import { withCompiler } from '@tsoa/cli/compiler';
import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyPathableNumberParameter, VerifyPathableParameter, VerifyPathableStringParameter } from '../../utilities/verifyParameter';
import { VerifyPath } from '../../utilities/verifyPath';

describe('GET route generation', () => {
  before(() =>
    withCompiler(() => {
      metadata = new MetadataGenerator('./fixtures/controllers/getController.ts').Generate();
      spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
    }),
  );

  let metadata: ReturnType<MetadataGenerator['Generate']>;
  let spec: ReturnType<SpecGenerator2['GetSpec']>;
  const baseRoute = '/GetTest';

  const getValidatedGetOperation = (actionRoute: string) => {
    const path = verifyPath(actionRoute);
    if (!path.get) {
      throw new Error('No get operation.');
    }

    return path.get;
  };

  const getValidatedSuccessResponse = (route: string) => {
    const get = getValidatedGetOperation(route);

    const responses = get.responses;
    if (!responses) {
      throw new Error('No responses.');
    }

    const successResponse = responses['200'];
    if (!successResponse) {
      throw new Error('No success response.');
    }

    return successResponse;
  };

  const getValidatedParameters = (actionRoute: string) => {
    const get = getValidatedGetOperation(actionRoute);
    if (!get.parameters) {
      throw new Error('No operation parameters.');
    }

    return get.parameters;
  };

  it('should generate a path for a GET route with no path argument', () => {
    verifyPath(baseRoute);
  });

  it('should generate params for date type parameter', () => {
    const parameters = getValidatedParameters(`${baseRoute}/DateParam`);

    const parameter = parameters[0];
    if (!parameter) {
      throw new Error('Should have one parameter.');
    }

    expect(parameter.type).to.equal('string');
    expect(parameter.format).to.equal('date-time');
  });

  it('should generate tags for tag decorated method', () => {
    const operation = getValidatedGetOperation(`${baseRoute}/GeneratesTags`);
    expect(operation.tags).to.deep.equal(['test', 'test-two']);
  });

  it('should generate a custom operation id for methods with that decorator', () => {
    const operation = getValidatedGetOperation(`${baseRoute}/CustomOperationId`);
    expect(operation.operationId).to.equal('MyCustomOperationId');
  });

  it('should generate a path for a GET route with no controller path argument', () => {
    return withCompiler(() => {
      const pathlessMetadata = new MetadataGenerator('./fixtures/controllers/pathlessGetController.ts').Generate();
      const pathlessSpec = new SpecGenerator2(pathlessMetadata, getDefaultExtendedOptions()).GetSpec();
      VerifyPath(pathlessSpec, '/Current', path => path.get, false);
    });
  });

  it('should generate a path for a GET route with a path argument', () => {
    const actionRoute = `${baseRoute}/Current`;
    verifyPath(actionRoute);
  });

  it('should generate a path for a GET route with const argument', () => {
    const actionRoute = `${baseRoute}/PathFromConstantValue`;
    verifyPath(actionRoute);
  });

  it('should generate a path for a GET route with Enum argument', () => {
    const actionRoute = `${baseRoute}/PathFromEnumValue`;
    verifyPath(actionRoute);
  });

  it('should generate a parameter for path parameters', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getValidatedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanPathParam', 'boolean', 'path');
    VerifyPathableParameter(parameters, 'numberPathParam', 'number', 'path', 'double');
    VerifyPathableParameter(parameters, 'stringPathParam', 'string', 'path');
  });

  it('should generate a parameter for query parameters', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getValidatedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanParam', 'boolean', 'query');
    VerifyPathableParameter(parameters, 'numberParam', 'number', 'query', 'double');
    VerifyPathableParameter(parameters, 'stringParam', 'string', 'query');
  });

  it('should generate a parameter for path parameters with decorator', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getValidatedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanPathParam', 'boolean', 'path');
    VerifyPathableNumberParameter(parameters, 'numberPathParam', 'number', 'path', 'double', 1, 10);
    VerifyPathableStringParameter(parameters, 'stringPathParam', 'string', 'path', 1, 10);
  });

  it('should generate a parameter for query parameters with decorator', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getValidatedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanParam', 'boolean', 'query');
    VerifyPathableParameter(parameters, 'numberParam', 'number', 'query', 'double');
    VerifyPathableStringParameter(parameters, 'stringParam', 'string', 'query', 3, 10);
  });

  it('should set a valid response type for collection responses', () => {
    const actionRoute = `${baseRoute}/Multi`;
    verifyPath(actionRoute, true);
  });

  it('should set a valid response type for union type return type', () => {
    const actionRoute = `${baseRoute}/UnionTypeResponse`;

    const paths = spec.paths;
    if (!paths) {
      throw new Error('No paths.');
    }

    const path = paths[actionRoute];
    if (!path) {
      throw new Error('No path.');
    }

    const getOperation = path.get;
    if (!getOperation) {
      throw new Error('No get operation.');
    }

    const responses = getOperation.responses;
    if (!responses) {
      throw new Error('No responses.');
    }

    const successResponse = responses['200'];
    if (!successResponse) {
      throw new Error('No success response.');
    }

    if (!successResponse.schema) {
      throw new Error('No response schema.');
    }
    if (!successResponse.schema.type) {
      throw new Error('No response schema type.');
    }

    expect(successResponse.schema.type).to.equal('object');
  });

  it('should not generate content for 204 responses in v3', () => {
    const oas3 = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
    const operation = oas3.paths['/GetTest/Void'].get;

    const voidResponse = operation?.responses[204];
    if (!voidResponse) {
      throw new Error('Void get operation not defined!');
    }
    expect(voidResponse).to.not.haveOwnProperty('content');
  });

  it('should reject complex types as arguments', () => {
    return withCompiler(() => {
      expect(() => {
        const invalidMetadata = new MetadataGenerator('./fixtures/controllers/invalidGetController.ts').Generate();
        new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
      }).to.throw("@Query('myModel') Can't support 'refObject' type. \n in 'InvalidGetTestController.getModelWithComplex'");
    });
  });

  it('should reject Query and Queries decorators at the same time', () => {
    return withCompiler(() => {
      expect(() => {
        const invalidMetadata = new MetadataGenerator('./fixtures/controllers/invalidQueryController.ts').Generate();
        new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
      }).to.throw("Choose either during @Query or @Queries in 'InvalidQueryTestController.getQueryAndQueries' method.");
    });
  });

  it('should reject multiple Queries decorators', () => {
    return withCompiler(() => {
      expect(() => {
        const invalidMetadata = new MetadataGenerator('./fixtures/controllers/invalidQueriesController.ts').Generate();
        new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
      }).to.throw("Only one queries parameter allowed in 'InvalidQueriesTestController.getWithMultipleQueriesParams' method.");
    });
  });

  // COMPILERS.md limit: inferred import return types.
  it('should reject nested Query object inside Queries decorator', () =>
    knownLimit(
      ['typescript@7.0.2', 'typescript@7.1.0-beta', 'tsrs@0.20.0-ts7.1.0-beta'],
      /but got 'Unknown type: LastTypeNode\\nAt: /,
    )(() => {
      return withCompiler(() => {
        expect(() => {
          const invalidMetadata = new MetadataGenerator('./fixtures/controllers/invalidNestedQueriesController.ts').Generate();
          new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
        }).to.throw("@Queries('nestedQueries') nested property 'nestedObject' Can't support 'refObject' type. \n in 'InvalidNestedQueriesController.nestedQueriesMethod'");
      });
    }));

  it('should support TypeScript type aliases for @Queries', () => {
    const operation = getValidatedGetOperation(`${baseRoute}/AllQueriesInOneObjectWithTypeAlias`);
    expect(operation.parameters).to.have.length(4);

    const paramNames = operation.parameters!.map((p: any) => p.name);
    expect(paramNames).to.include.members(['numberParam', 'stringParam', 'booleanParam', 'optionalStringParam']);

    operation.parameters!.forEach((param: any) => {
      expect(param.in).to.equal('query');
    });
  });

  it('should reject invalid header types', function () {
    return withCompiler(() => {
      this.timeout(10_000);
      expect(() => {
        new MetadataGenerator('./fixtures/controllers/invalidHeaderController.ts').Generate();
      }).to.throw(/^Unable to parse Header Type 'Header names must be of type string.*/);

      expect(() => {
        new MetadataGenerator('./fixtures/controllers/incorrectResponseHeaderController.ts').Generate();
      }).to.throw(/^Unable to parse Header Type any.*/);
    });
  });

  it('should resolve indexed access into imported values', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/unsupportedIndexedTypeController.ts').Generate();
    expect(metadata.referenceTypeMap.ForeignIndexedValue).to.deep.include({ dataType: 'refAlias', type: { dataType: 'enum', enums: ['FOO'] } });
  });

  it('should map Buffer even when its declarations are not in the program', () => {
    // Without @types/node (TypeScript 6 no longer includes @types by default) Buffer has no declarations.
    const metadata = new MetadataGenerator('./fixtures/controllers/bufferWithoutNodeTypesController.ts', { types: [], noResolve: true }).Generate();
    const [method] = metadata.controllers[0].methods;
    expect(method.type).to.deep.equal({ dataType: 'buffer' });
    expect(method.parameters[0].type).to.deep.equal({ dataType: 'buffer' });
  });

  describe('built-in classes that have no JSON form', () => {
    const errorOf = (controller: string) => {
      try {
        new MetadataGenerator(`./fixtures/controllers/${controller}.ts`).Generate();
      } catch (e) {
        return (e as Error).message;
      }
      throw new Error(`${controller} generated without an error`);
    };
    const mustMap = 'Built-in classes such as Set and Map have no JSON form and must be mapped to a supported type: an array, an object type or an interface.';

    it('should name the path, location and method of a written parameter property', () => {
      const message = errorOf('unsupportedBuiltInController');
      expect(message).to.include(`Unsupported type: Set<string> at 'body.tags'. ${mustMap}`);
      expect(message).to.match(/At: fixtures[\\/]controllers[\\/]unsupportedBuiltInController\.ts:6:6\./);
      expect(message).to.include("in 'UnsupportedBuiltInController.post'");
    });

    it('should name the path and declaration of a nested array element reached through a mapped type', () => {
      const message = errorOf('unsupportedBuiltInNestedController');
      expect(message).to.include(`Unsupported type: Map<string, number> at 'groups[].members'. ${mustMap}`);
      expect(message).to.match(/At: fixtures[\\/]controllers[\\/]unsupportedBuiltInNestedController\.ts:5:5\./);
      expect(message).to.include("in 'UnsupportedBuiltInNestedController.get' return type");
    });

    it('should name the path and source of an inferred return type', () => {
      const message = errorOf('unsupportedBuiltInInferredController');
      expect(message).to.include(`Unsupported type: Set<string> at 'tags'. ${mustMap}`);
      expect(message).to.match(/At: fixtures[\\/]controllers[\\/]unsupportedBuiltInInferredController\.ts:7:7\./);
      expect(message).to.include("in 'UnsupportedBuiltInInferredController.get' return type");
    });
  });

  it('should give each tuple type argument its own readable name', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/tupleNamesController.ts').Generate();
    expect(Object.keys(metadata.referenceTypeMap)).to.have.members(['TupleBox__string.number__', 'TupleBox__number.string__']);
  });

  it('should generate a path description from jsdoc comment', () => {
    const get = getValidatedGetOperation(baseRoute);
    if (!get.description) {
      throw new Error('No description.');
    }

    expect(get.description).to.contain('This is a description of the getModel method');
  });

  it('should generate optional parameters from default value', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getValidatedParameters(actionRoute);

    const parameter = parameters.filter((p: any) => p.name === 'optionalStringParam')[0];
    expect(parameter).to.exist;
    expect(parameter.required).to.be.false;
  });

  it('should generate parameter description from jsdoc comment on path parameter', () => {
    verifyParameterDescription('numberPathParam');
  });

  it('should generate parameter description from jsdoc comment on query parameter', () => {
    verifyParameterDescription('numberParam');
  });

  it('should generate example from example decorator', () => {
    const response = getValidatedSuccessResponse(baseRoute);
    if (!response.examples) {
      throw new Error('No examples.');
    }

    const jsonExample = response.examples['application/json'] as any;
    if (!jsonExample) {
      throw new Error('No json example.');
    }

    expect(response.description).to.equal('Returns TestModel');
    expect(jsonExample.id).to.equal(1);
    expect(jsonExample.boolArray).to.deep.equal([true, false]);
    expect(jsonExample.boolValue).to.equal(true);
    expect(jsonExample.modelValue.email).to.equal('test@test.com');
    expect(jsonExample.modelValue.id).to.equal(100);
    expect(jsonExample.modelsArray).to.be.undefined;
    expect(jsonExample.numberArray).to.deep.equal([1, 2, 3]);
    expect(jsonExample.numberArrayReadonly).to.deep.equal([1, 2, 3]);
    expect(jsonExample.numberValue).to.equal(1);
    expect(jsonExample.optionalString).to.equal('optional string');
    expect(jsonExample.stringArray).to.deep.equal(['string one', 'string two']);
    expect(jsonExample.stringValue).to.equal('a string');
  });

  function verifyParameterDescription(parameterName: string) {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getValidatedParameters(actionRoute);

    const parameter = parameters.filter((p: any) => p.name === parameterName)[0];
    expect(parameter).to.exist;
    expect(parameter.description).to.equal(`This is a description for ${parameterName}`);
  }

  function verifyPath(route: string, isCollection?: boolean) {
    return VerifyPath(spec, route, path => path.get, isCollection);
  }
});
