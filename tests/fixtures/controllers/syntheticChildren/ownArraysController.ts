import { Get, Route } from '@tsoa/runtime';
import { Keep, Leaf } from './models';
import { Array as Chain, ReadonlyArray as FrozenChain } from './ownArrays';

interface Holder {
  chain: Chain<Leaf>;
  frozen: FrozenChain<Leaf>;
}

@Route('synthetic-children')
export class OwnArraysController {
  @Get()
  public get(): Holder {
    return { chain: { head: { text: '', count: 0 }, tail: 0 }, frozen: { front: { text: '', count: 0 }, rest: 0 } };
  }

  @Get('mapped')
  public mapped(): Keep<{ frozen: FrozenChain<Leaf> }> {
    return { frozen: { front: { text: '', count: 0 }, rest: 0 } };
  }
}
