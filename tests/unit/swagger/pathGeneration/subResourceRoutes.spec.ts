import 'mocha';
import { expect } from 'chai';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime/metadataGeneration/tsoa';


describe('Sub resource route generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/subresourceController.ts').Generate();

  const variants = [
    {
      name: 'Using brackets',
      baseRoute: 'SubResourceTest/{mainResourceId}/SubResource',
    },
    {
      name: 'Using colon',
      baseRoute: 'SubResourceColonTest/:mainResourceId/SubResource',
    },
  ];

  variants.forEach(({ name, baseRoute }) => {
    describe(name, () => {
      const getParameters = (methodPath: string) => {
        const controller = metadata.controllers.find(c => c.path === baseRoute);
        if (!controller) {
          throw new Error(`Missing controller for ${baseRoute}`);
        }

        const method = controller.methods.find(m => m.path === methodPath);
        if (!method) {
          throw new Error('Unknown method ');
        }

        return method.parameters;
      };

      const validatePathParameter = (parameters: Tsoa.Parameter[], name: string) => {
        const parameter = parameters.find(p => p.name === name);
        expect(parameter, `Path parameter '${name}' wasn't generated.`).to.exist;
        expect(parameter!.in).to.equal('path');
        expect(parameter!.type).to.eql({ dataType: 'string' });
      };

      it('should generate a path parameter for method without path parameter', () => {
        const parameters = getParameters('');
        validatePathParameter(parameters, 'mainResourceId');
      });

      it('should generate two path parameters for method with path parameter', () => {
        const parameters = getParameters('{subResourceId}');
        validatePathParameter(parameters, 'mainResourceId');
        validatePathParameter(parameters, 'subResourceId');
      });
    });
  });
});
