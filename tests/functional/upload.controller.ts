import {
    Consumers,
    Post,
    Route,
    UploadFile,
} from '../../src';

@Route('UploadController')
export class UploadController {
    @Post('File')
    @Consumers('multipart/form-data')
    public async image(@UploadFile('avater') avaterData: any): Promise<void> {
        //
    }
}
