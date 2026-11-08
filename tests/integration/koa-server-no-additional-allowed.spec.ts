import 'mocha';
import { server } from '../fixtures/koaNoAdditional/server';
import { registerNoImplicitAdditionalPropertiesTests } from './common/additional-properties';

describe('Koa Server (with noImplicitAdditionalProperties turned on)', () => {
  registerNoImplicitAdditionalPropertiesTests(server, '/v1');

  it('shutdown server', () => server.close());
});
