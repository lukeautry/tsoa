import e = require('express');
import { Container } from 'inversify';
import { ManagedController } from './managedController';
import { ManagedService } from './managedService';

const iocContainer = function (request: e.Request): Container {
  const container = new Container();
  container.bind<string>(Symbol.for('requestPath')).toConstantValue(request.path);
  container.bind<ManagedService>(ManagedService).to(ManagedService);
  container.bind<ManagedController>(ManagedController).to(ManagedController).inSingletonScope();
  return container;
};

export { iocContainer };
