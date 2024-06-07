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

  @Post()
  public async postModel(@Body() model: TestModel): Promise<TestModel> {
    return model;
  }

  @Post('Object')
  public async postObject(@Body() body: { obj: { [key: string]: string } }): Promise<{ [key: string]: string }> {
    return body.obj;
  }

  @Patch()
  public async updateModel(@Body() model: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Post('WithDifferentReturnCode')
  public async postWithDifferentReturnCode(@Body() model: TestModel): Promise<TestModel> {
    this.setStatus(201);
    return model;
  }

  @Post('WithClassModel')
  public async postClassModel(@Body() model: TestClassModel): Promise<TestClassModel> {
    const augmentedModel = new TestClassModel('test', 'test2', 'test3', 'test4', 'test5');
    augmentedModel.id = 700;

    return augmentedModel;
  }

  @Post('File')
  public async postWithFile(@UploadedFile('someFile') aFile: File): Promise<File> {
    return aFile;
  }

  @Post('FileOptional')
  public async postWithOptionalFile(@UploadedFile('optionalFile') optionalFile?: File): Promise<string> {
    return optionalFile?.originalname ?? 'no file';
  }

  @Post('FileWithoutName')
  public async postWithFileWithoutName(@UploadedFile() aFile: File): Promise<File> {
    return aFile;
  }

  @Post('ManyFilesAndFormFields')
  public async postWithFiles(@UploadedFiles('someFiles') files: File[], @FormField('a') a: string, @FormField('c') c: string): Promise<File[]> {
    return files;
  }

  @Post('ManyFilesInDifferentFields')
  public async postWithDifferentFields(@UploadedFile('file_a') fileA: File, @UploadedFile('file_b') fileB: File): Promise<File[]> {
    return [fileA, fileB];
  }

  @Post('ManyFilesInDifferentArrayFields')
  public async postWithDifferentArrayFields(@UploadedFiles('files_a') filesA: File[], @UploadedFile('file_b') fileB: File, @UploadedFiles('files_c') filesC: File[]): Promise<File[][]> {
    return [filesA, [fileB], filesC];
  }

  @Post('MixedFormDataWithFilesContainsOptionalFile')
  public async mixedFormDataWithFile(
    @FormField('username') username: string,
    @UploadedFile('avatar') avatar: File,
    @UploadedFile('optionalAvatar') optionalAvatar?: File,
  ): Promise<{ username: string; avatar: File; optionalAvatar?: File }> {
    return { username, avatar, optionalAvatar };
  }

  /**
   *
   * @param aFile File description of multipart
   * @param a FormField description of multipart
   * @param c
   */
  @Post('DescriptionOfFileAndFormFields')
  public async postWithFileAndParams(@UploadedFile('file') aFile: File, @FormField('a') a: string, @FormField('c') c: string): Promise<File> {
    return aFile;
  }

  @Post('DeprecatedFormField')
  public async postWithDeprecatedParam(@FormField('a') a: string, @FormField('dontUse') @Deprecated() dontUse?: string): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Post('Location')
  public async postModelAtLocation(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Post('Multi')
  public async postWithMultiReturn(): Promise<TestModel[]> {
    const model = new ModelService().getModel();

    return [model, model];
  }

  @Post('WithId/{id}')
  public async postWithId(id: number): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Post('WithBodyAndQueryParams')
  public async postWithBodyAndQueryParams(@Body() model: TestModel, @Query() query: string): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Post('GenericBody')
  public async getGenericRequest(@Body() genericReq: GenericRequest<TestModel>): Promise<TestModel> {
    return genericReq.value;
  }
}
