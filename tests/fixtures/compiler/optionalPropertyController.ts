import { Controller, Get, Route } from '@tsoa/runtime';

interface OptionalModel {
  label?: string;
}

class OptionalClassModel {
  label?: string;
  requiredLabel!: string;
}

@Route('compiler-optional')
export class OptionalPropertyController extends Controller {
  @Get()
  public get(): OptionalModel {
    return {};
  }

  @Get('class')
  public getClass(): OptionalClassModel {
    return new OptionalClassModel();
  }
}
