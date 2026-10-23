import { Get, Route } from '@tsoa/runtime';
import { Base, Derived, DerivedClass, Generic, Left, Right, Sibling } from './models';

interface DerivedFirst {
  sibling: Sibling;
  generic: Generic<Left>;
  classDerived: DerivedClass;
  derived: Derived;
  rightBase: Base<Right>;
  leftBase: Base<Left>;
}

@Route('type-context-heritage')
export class DerivedFirstController {
  @Get()
  public get(): DerivedFirst {
    return { sibling: { shared: 'own', extra: true }, generic: { extra: 'extra' }, classDerived: new DerivedClass(), derived: { extra: 'extra' }, rightBase: {}, leftBase: {} };
  }
}
