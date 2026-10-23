import { Get, Route } from '@tsoa/runtime';
import { Optional } from './models';

interface InterfaceLeaf {
  interfaceValue: string;
}

interface ClassLeaf {
  classValue: number;
}

interface Base<T> {
  /** Inherited interface value. */
  value: T;
}

interface Derived<T> extends Base<Optional<T>> {
  label: string;
}

class BaseClass<T> {
  /** Inherited class value. */
  public value!: T;
}

class DerivedClass<T> extends BaseClass<Optional<T>> {
  public marker = true;
}

@Route('type-context-boundaries')
export class HeritageController {
  @Get('interface')
  public interfaceValue(): Derived<InterfaceLeaf> {
    return { value: {}, label: 'derived' };
  }

  @Get('class')
  public classValue(): DerivedClass<ClassLeaf> {
    return new DerivedClass<ClassLeaf>();
  }
}
