import { Get, Route } from '../../../src';
import { TruncationTestModel } from '../testModel';

@Route('TruncationTest')
export class TruncationTestController {
  @Get('unabridgedObject')
  public async unabridgedObject() {
    return {
      demo01: '',
      demo02: '',
      demo03: '',
      demo04: '',
      demo05: '',
      demo06: '',
      demo07: '',
      demo08: '',
      demo09: '',
      demo10: '',
      demo11: '',
      demo12: '',
      demo13: '',
      demo14: '',
      demo15: '',
      demo16: '',
      demo17: '',
    };
  }

  @Get('abridgedObject')
  public async abridgedObject() {
    return {
      demo01: '',
      demo02: '',
      demo03: '',
      demo04: '',
      demo05: '',
      demo06: '',
      demo07: '',
      demo08: '',
      demo09: '',
      demo10: '',
      demo11: '',
      demo12: '',
      demo13: '',
      demo14: '',
      demo15: '',
      demo16: '',
      demo17: '',
      d: '',
    };
  }

  @Get('abridgedObjectWithTypeModel')
  public async abridgedObjectWithTypeModel(): Promise<TruncationTestModel> {
    return {
      demo01: '',
      demo02: '',
      demo03: '',
      demo04: '',
      demo05: '',
      demo06: '',
      demo07: '',
      demo08: '',
      demo09: '',
      demo10: '',
      demo11: '',
      demo12: '',
      demo13: '',
      demo14: '',
      demo15: '',
      demo16: '',
      demo17: '',
      d: '',
    };
  }
}
