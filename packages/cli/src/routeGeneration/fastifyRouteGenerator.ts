import * as handlebars from 'handlebars';
import { DefaultRouteGenerator } from './defaultRouteGenerator';

export class FastifyRouteGenerator extends DefaultRouteGenerator {
  constructor(metadata, options) {
    super(metadata, options);
  }

  public buildContent(middlewareTemplate: string) {
    handlebars.registerHelper('fastifyDataType', (dataType: string) => {
      switch (dataType) {
        case 'double':
          return 'number'; // Fastify/swagger doesn't have double type
        case 'refObject':
        case 'nestedObjectLiteral':
        case 'refAlias':
          return 'object'; // we use $ref in fastify template
        case 'datetime':
          return 'string'; // ToDo is there a fastify type for datetime?
        case 'void':
          return 'null'; // Empty response
        default:
          return dataType;
      }
    });

    return super.buildContent(middlewareTemplate);
  }
}
