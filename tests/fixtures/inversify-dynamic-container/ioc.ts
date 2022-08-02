import e = require('express');
import { Container } from 'inversify';
import { ManagedController } from './managedController';
import { ManagedService } from './managedService';
import { IocContainerFactory, IocContainer } from '@namecheap/tsoa-runtime';

const iocContainer: IocContainerFactory = function (request: e.Request): IocContainer {
  const container = new Container();
  container.bind<string>(Symbol.for('requestPath')).toConstantValue(request.path);
  container.bind<ManagedService>(ManagedService).to(ManagedService);
  container.bind<ManagedController>(ManagedController).to(ManagedController).inSingletonScope();
  return container;
};

export { iocContainer };
