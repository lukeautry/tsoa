import { Get, Route } from '@tsoa/runtime';
import { Field } from 'multer';

enum Color {
  Red = 'red',
  Blue = 'blue',
}

interface Holder {
  flag: boolean | Field;
  color: Color | Field;
}

@Route('synthetic-children')
export class PackageMemberController {
  @Get()
  public get(): Partial<Holder> {
    return {};
  }
}
