import 'mocha';
import { server, app as fastify } from '../fixtures/fastifyNoAdditional/server';
import { registerNoImplicitAdditionalPropertiesTests } from './common/additional-properties';

describe('Fastify Server (with noImplicitAdditionalProperties turned on)', () => {
  before(() => fastify.listen({ port: 0 }));
  after(() => fastify.close());
  registerNoImplicitAdditionalPropertiesTests(server, '/v1');
});
