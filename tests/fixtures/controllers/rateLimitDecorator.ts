import 'reflect-metadata';
import { NodeDecoratorProcessor, DecoratorProcessorContext } from '../../../packages/cli/src/metadataGeneration/types/nodeDecoratorProcessor';

export function RateLimitByUserId(limit: number, timeWindow: number, description?: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const metadataKey = Symbol('tsoa:rate-limit-by-user-id');
    Reflect.defineMetadata(
      metadataKey,
      {
        limit,
        timeWindow,
        description: description || `${limit} requests per ${timeWindow} seconds per user`,
      },
      descriptor.value,
    );

    return descriptor;
  };
}

export const RateLimitByUserIdProcessor: NodeDecoratorProcessor = (context: DecoratorProcessorContext) => {
  const { methodObject, decoratorArguments } = context;

  const limit = decoratorArguments[0] as number;
  const timeWindow = decoratorArguments[1] as number;
  const description = decoratorArguments[2] as string;

  if (!methodObject.extensions) {
    methodObject.extensions = [];
  }

  methodObject.extensions.push({
    key: 'x-rate-limit-by-user-id',
    value: {
      limit: limit || 100,
      timeWindow: timeWindow || 60,
      description: description || `${limit || 100} requests per ${timeWindow || 60} seconds per user`,
    },
  });
};
