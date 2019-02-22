import { Context, GenericObject } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import { Get, Ignore, Path, Route, Security } from '../../../src';
import { ModelService } from '../services/modelService';
import { TestClassModel } from '../testModel';
import { User } from './api.service';

interface ChatsActionParams {
  withUser: string;
}

export interface AuthMeta {
  user: User;
  $statusCode?: number;
}

export interface AuthContext<P = GenericObject> extends Context<P, AuthMeta> {
  meta: AuthMeta;
  params: P;
}

@Service()
@Route('GetTest')
class GetTest {
  @Action({
    params: {
      withUser: 'string',
    },
  })
  public async getModel(ctx: AuthContext<ChatsActionParams>) {
    const {withUser} = ctx.params;
    const fromUser = ctx.meta.user.id;
    return this._getModel(withUser, fromUser);
  }

  @Get('/getModel/{withUser}')
  @Security('ApiKeyAuth')
  @Method
  private _getModel(@Path() withUser: string, @Ignore() fromUser: string): Promise<TestClassModel> {
    return Promise.resolve(new ModelService().getClassModel());
  }
}

module.exports = GetTest;
