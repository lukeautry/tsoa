import { Container } from 'inversify';
import { ManagedController } from './managedController';
import { ManagedService } from './managedService';

const iocContainer = new Container();
iocContainer.bind<ManagedService>(ManagedService).to(ManagedService).inSingletonScope();
iocContainer.bind<ManagedController>(ManagedController).to(ManagedController).inSingletonScope();

export { iocContainer };
