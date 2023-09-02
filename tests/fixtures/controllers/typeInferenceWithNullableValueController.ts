import { Get, Route } from '@tsoa/runtime';

@Route('inference')
export class TypeInferenceWithNullableValueController {
  @Get('keys-inference-with-nullable')
  public multiKeysInterfaceInferenceWithNullable() {
    const maybeString: string | null = Math.random() > 0.5 ? 'foo' : null;
    return maybeString;
  }
}
