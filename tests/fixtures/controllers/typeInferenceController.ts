import { Get, Route } from '@namecheap/tsoa-runtime';
import { TruncationTestModel } from '../testModel';

@Route('inference')
export class TypeInferenceController {
  @Get('keys-interface-inference')
  public multiKeysInterfaceInference(): Partial<TruncationTestModel> {
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

  @Get('keys-property-inference')
  public multiKeysPropertyInference() {
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
      demo18: '',
      demo19: '',
      demo20: '',
      demo21: '',
    };
  }
}
