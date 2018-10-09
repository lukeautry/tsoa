import { inject, injectable } from 'inversify';
import { Get, Route, Security } from '../../../src';
import { TestModel } from '../testModel';
import { RouteParameterService } from './routeParameterService';

@injectable()
@Route('{routeParameter}/ManagedTest')
@Security('MySecurity')
export class RouteParameterController {

  constructor(
    @inject(RouteParameterService) private routeParameterService: RouteParameterService,
  ) { }

  @Get()
  public async getModel(routeParameter: string): Promise<TestModel> {
    return this.routeParameterService.getModel(routeParameter);
  }
}
