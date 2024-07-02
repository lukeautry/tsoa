import { Body, Deprecated, File, FormField, Patch, Post, Query, Route, UploadedFile, UploadedFiles } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { GenericRequest, TestClassModel, TestModel } from '../testModel';

@Route('PostTest')
export class PostTestController {
  private statusCode?: number = undefined;

  public setStatus(statusCode: number) {
    this.statusCode = statusCode;
  }

  public getStatus() {
    return this.statusCode;
  }

  public getHeaders() {
    return [];
  }

  @Post('WithObjectParamsFields')
  public async postWithObjectParamsFields(@UploadedFile({ toPath: 'a/b/c' }) fileA: File, @UploadedFile({ toPath: 'a/b/c' }) fileB: File): Promise<File[]> {
    return [fileA, fileB];
  }
}
