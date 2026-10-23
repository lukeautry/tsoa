import { Get, Route } from '@tsoa/runtime';
import { Base, Derived, DerivedClass, Generic, Left, Right, Sibling } from './models';

interface BaseFirst {
  leftBase: Base<Left>;
  rightBase: Base<Right>;
  derived: Derived;
  classDerived: DerivedClass;
  generic: Generic<Left>;
  sibling: Sibling;
}

@Route('type-context-heritage')
export class BaseFirstController {
  @Get()
  public get(): BaseFirst {
    return { leftBase: {}, rightBase: {}, derived: { extra: 'extra' }, classDerived: new DerivedClass(), generic: { extra: 'extra' }, sibling: { shared: 'own', extra: true } };
  }
}
