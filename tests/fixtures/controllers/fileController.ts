import {
  Controller, FileResult, Get, Produces, Route,
} from '../../../src';
import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('File')
export class FileController extends Controller {

  @Get('normalGetMethod')
  public async normalGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }

  @Get('producesTextHtmlContent')
  @Produces('text/html; charset=utf-8')
  public async producesTextHtmlContent(): Promise<FileResult> {
    const result = new FileResult();

    result.data = '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">'
      + '<html lang="en"><head><title>title</title></head>'
      + '<body></body></html>';

    return result;
  }
}
