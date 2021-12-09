import { Container } from 'inversify';
import { AsyncController } from './asyncController';
import { AsyncService } from './asyncService';
import { AsyncErrorController } from './asyncErrorController';

const container = new Container();
container.bind<AsyncService>(AsyncService).to(AsyncService).inSingletonScope();
container.bind<AsyncController>(AsyncController).to(AsyncController).inSingletonScope();
container.bind('error').toFactory(() => {
  throw new Error('DI Error');
  return () => {
    return '';
  };
});
container.bind<AsyncErrorController>(AsyncErrorController).to(AsyncErrorController).inSingletonScope();

const iocContainer = {
  async get<T>(controller: { prototype: T }): Promise<T> {
    return container.get(controller);
  },
};
export { iocContainer };
