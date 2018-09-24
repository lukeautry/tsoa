import { Container } from 'inversify';
import { RouteParameterController } from './routeParameterController';
import { RouteParameterService } from './routeParameterService';

const iocContainer = new Container();
iocContainer.bind<RouteParameterService>(RouteParameterService).to(RouteParameterService).inSingletonScope();
iocContainer.bind<RouteParameterController>(RouteParameterController).to(RouteParameterController).inSingletonScope();

export { iocContainer };
