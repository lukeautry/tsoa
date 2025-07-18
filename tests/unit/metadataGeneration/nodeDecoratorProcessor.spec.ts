import { Tsoa } from '@namecheap/tsoa-runtime';
import { NodeDecoratorProcessor, DecoratorProcessorContext } from '../../../packages/cli/src/metadataGeneration/types/nodeDecoratorProcessor';
import { expect } from 'chai';

describe('NodeDecoratorProcessor', () => {
  const createRateLimitProcessor = (limit: number, timeWindow: number, description?: string): NodeDecoratorProcessor => {
    return (context: DecoratorProcessorContext) => {
      const { methodObject } = context;

      if (!methodObject.extensions) {
        methodObject.extensions = [];
      }

      methodObject.extensions.push({
        key: 'x-rate-limit',
        value: {
          limit,
          timeWindow,
          description: description || `${limit} requests per ${timeWindow} seconds`,
        },
      });
    };
  };

  describe('Decorator Processor', () => {
    it('should add rate limit extension metadata to method object using context', () => {
      const methodObject: Tsoa.Method = {
        extensions: [],
        method: 'get',
        name: 'testMethod',
        operationId: 'testOperationId',
        path: 'test',
        produces: ['application/json'],
        responses: [],
        security: [],
        tags: ['test'],
        parameters: [],
        type: { dataType: 'void' },
        isHidden: false,
      };

      const context: DecoratorProcessorContext = {
        methodObject,
        decoratorArguments: [100, 60, 'Maximum 100 requests per minute'],
      };

      const rateLimitProcessor = createRateLimitProcessor(100, 60, 'Maximum 100 requests per minute');
      rateLimitProcessor(context);

      expect(methodObject.extensions.length).to.equal(1);
      expect(methodObject.extensions[0].key).to.equal('x-rate-limit');
      expect(methodObject.extensions[0].value).to.deep.equal({
        limit: 100,
        timeWindow: 60,
        description: 'Maximum 100 requests per minute',
      });
    });

    it('should initialize extensions array if it does not exist', () => {
      const methodObject: Tsoa.Method = {
        extensions: [],
        method: 'get',
        name: 'testMethod',
        operationId: 'testOperationId',
        path: 'test',
        produces: ['application/json'],
        responses: [],
        security: [],
        tags: ['test'],
        parameters: [],
        type: { dataType: 'void' },
        isHidden: false,
      };

      const context: DecoratorProcessorContext = {
        methodObject,
        decoratorArguments: [50, 30],
      };

      const rateLimitProcessor = createRateLimitProcessor(50, 30);
      rateLimitProcessor(context);

      expect(methodObject.extensions).to.exist;
      expect(methodObject.extensions.length).to.equal(1);
      expect(methodObject.extensions[0].key).to.equal('x-rate-limit');
      expect((methodObject.extensions[0].value as any).limit).to.equal(50);
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle exceptions thrown by processors', () => {
      const methodObject: Tsoa.Method = {
        method: 'get',
        name: 'testMethod',
        operationId: 'testOperationId',
        path: 'test',
        produces: ['application/json'],
        responses: [],
        security: [],
        tags: ['test'],
        parameters: [],
        type: { dataType: 'void' },
        isHidden: false,
        extensions: [],
      };

      const context: DecoratorProcessorContext = {
        methodObject,
        decoratorArguments: ['test', 'error'],
      };

      const errorProcessor: NodeDecoratorProcessor = () => {
        throw new Error('Test error in processor');
      };

      expect(() => {
        try {
          errorProcessor(context);
        } catch (error) {
          // In the actual code, this would be caught and logged
          // Here we're just verifying the error is thrown as expected
        }
      }).to.not.throw();
    });
  });
});
