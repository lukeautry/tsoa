import { Container } from 'inversify';
import { AsyncController } from './asyncController';
import { AsyncService } from './asyncService';

const container = new Container();
container.bind<AsyncService>(AsyncService).to(AsyncService).inSingletonScope();
container.bind<AsyncController>(AsyncController).to(AsyncController).inSingletonScope();
const iocContainer = {
  async get<T>(controller: { prototype: T }): Promise<T> {
    return container.get(controller);
  },
};
export { iocContainer };
