import { Controller, Get, Route } from '@tsoa/runtime';

interface OptionalModel {
  label?: string;
}

@Route('compiler-optional')
export class OptionalPropertyController extends Controller {
  @Get()
  public get(): OptionalModel {
    return {};
  }
}
