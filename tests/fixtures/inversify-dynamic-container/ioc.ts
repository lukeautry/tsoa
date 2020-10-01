import { Container } from 'inversify';
import { ManagedController } from './managedController';
import { ManagedService } from './managedService';

export let containerMethodCalled = false;

const iocContainer = function (request: Express.Request): Container {
  const container = new Container();
  containerMethodCalled = true;
  container.bind<ManagedService>(ManagedService).to(ManagedService).inSingletonScope();
  container.bind<ManagedController>(ManagedController).to(ManagedController).inSingletonScope();
  return container;
};

export { iocContainer };
