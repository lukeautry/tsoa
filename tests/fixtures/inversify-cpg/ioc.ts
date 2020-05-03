import { Container } from 'inversify';
import { buildProviderModule } from 'inversify-binding-decorators';

const iocContainer = new Container();

iocContainer.load(buildProviderModule());

export { iocContainer };
