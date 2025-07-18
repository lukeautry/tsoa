import { Tsoa } from '@namecheap/tsoa-runtime';

export interface DecoratorProcessorContext {
  methodObject: Tsoa.Method;
  decoratorArguments: any[];
}

export type NodeDecoratorProcessor = (context: DecoratorProcessorContext) => void;
