import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { Config } from '@tsoa/runtime';
export function getDefaultOptions(outputDirectory = '', entryFile = ''): Config {
  return {
    entryFile,
    controllerPathGlobs: [],
    routes: {
      routesDir: './build',
    },
    spec: {
      basePath: '/v1',
      description: 'Description of a test API',
      host: 'localhost:3000',
      license: 'MIT',
      name: 'Test API',
      contact: {
        email: 'jane@doe.com',
        name: 'Jane Doe',
        url: 'www.jane-doe.com',
      },
      operationIdTemplate: '{{titleCase method.name}}',
      outputDirectory,
      securityDefinitions: {
        basic: {
          type: 'basic',
        },
        application: {
          type: 'oauth2',
          flow: 'application',
          tokenUrl: '/ats-api/auth/token',
          scopes: {
            user_read: 'user read',
            user_write: 'user_write',
          },
        },
        password: {
          type: 'oauth2',
          flow: 'password',
          tokenUrl: '/ats-api/auth/token',
          scopes: {
            user_read: 'user read',
            user_write: 'user_write',
          },
        },
        accessCode: {
          type: 'oauth2',
          flow: 'accessCode',
          tokenUrl: '/ats-api/auth/token',
          authorizationUrl: '/ats-api/auth/authorization',
          scopes: {
            user_read: 'user read',
            user_write: 'user_write',
          },
        },
        implicit: {
          type: 'oauth2',
          flow: 'implicit',
          authorizationUrl: '/ats-api/auth/authorization',
          scopes: {
            user_read: 'user read',
            user_write: 'user_write',
          },
        },
      },
      version: '1.0.0',
      tags: [{ name: 'hello', description: 'Endpoints related to greeting functionality' }],
    },
  };
}

export function getDefaultExtendedOptions(outputDirectory = '', entryFile = ''): ExtendedSpecConfig {
  const defaultOptions = getDefaultOptions(outputDirectory, entryFile);
  return {
    ...defaultOptions.spec,
    entryFile,
    noImplicitAdditionalProperties: 'ignore',
    controllerPathGlobs: defaultOptions.controllerPathGlobs,
  };
}
