import { Get } from '../../../src/decorators/methods';
import { Route } from '../../../src/decorators/route';
import { JWT } from '../../../src/decorators/jwt';
import { JwtHolder } from '../../../src/interfaces/jwtHolder';
import { BooleanResponseModel } from '../../fixtures/testModel';

@JWT('user_jwt_data')
@Route('JwtGetTest')
export class JwtGetTestController implements JwtHolder {
  public aud: string;
  public iss: string;
  public sub: string;

  // Returns true if jwt validation passed successfully
  @Get()
  public async GetWithJwt(): Promise<BooleanResponseModel> {
    return <BooleanResponseModel>{ success: (this.iss === '1' && this.aud === '1' && this.sub === '1') };
  }
}
