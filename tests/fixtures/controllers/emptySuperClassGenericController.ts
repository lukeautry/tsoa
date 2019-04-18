import { Route } from '../../../src'
import { TestModel } from '../testModel'
import { BaseController } from './baseController'

class SuperBase<T> extends BaseController<T> {
}

@Route('EmptySuperClassGenericController')
export class EmptySuperClassGenericController extends SuperBase<TestModel> {
}
