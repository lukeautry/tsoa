// TODO: Replace this with HAPI middleware stuff
/* tslint:disable */
import * as hapi from 'hapi';
{{#if canImportByAlias}}
  import { ValidateParam, FieldErrors, ValidateError } from 'tsoa';
  import { Controller } from 'tsoa';
{{else}}
  import { ValidateParam, FieldErrors, ValidateError } from '../../../src/routeGeneration/templateHelpers';
  import { Controller } from '../../../src/interfaces/controller';
{{/if}}
{{#if iocModule}}
import { iocContainer } from '{{iocModule}}';
{{/if}}
{{#each controllers}}
import { {{name}} } from '{{modulePath}}';
{{/each}}
{{#if useSecurity}}
import { set } from 'lodash';
{{/if}}
{{#if authenticationModule}}
import { hapiAuthentication } from '{{authenticationModule}}';
{{/if}}
{{#if useFileUploads}}
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
{{/if}}

const models: any = {
  {{#each models}}
  "{{name}}": {
      {{#if properties}}
      properties: {
          {{#each properties}}
              "{{@key}}": {{{json this}}},
          {{/each}}
      },
      {{/if}}
      {{#if additionalProperties}}
      additionalProperties: {{{json additionalProperties}}},
      {{/if}}
  },
  {{/each}}
};

export function RegisterRoutes(server: hapi.Server) {
    {{#each controllers}}
    {{#each actions}}
        server.route({
            method: '{{method}}',
            path: '{{../../basePath}}/{{../path}}{{path}}',
            config: {
                {{#if uploadFile}}
                payload: {
                  output: 'stream',
                  parse: true,
                  allow: 'multipart/form-data'
                },
                {{else if uploadFiles}}
                payload: {
                  output: 'stream',
                    parse: true,
                    allow: 'multipart/form-data'
                },
                {{/if}}

                pre: [
                {{#if security}}
                    {
                      method: authenticateMiddleware('{{security.name}}'
                              {{#if security.scopes.length}} 
                              , {{{json security.scopes}}}
                              {{/if}}
                    )},
                {{/if}}
                {{#if uploadFile}}
                    {
                      method: fileUploadMiddleware('{{uploadFileName}}', false)
                    }
                {{/if}}
                {{#if uploadFiles}}
                    {
                      method: fileUploadMiddleware('{{uploadFilesName}}', true)
                    }
                {{/if}}
                ],
                handler: (request: any, reply: hapi.IReply) => {
                  const args = {
                    {{#each parameters}}
                    {{@key}}: {{{json this}}},
                    {{/each}}
                  };

                  let validatedArgs: any[] = [];
                  try {
                    validatedArgs = getValidatedArgs(args, request);
                  } catch (err) {
                    return reply(err).code(err.status || 500);
                  }

                  {{#if ../../iocModule}}
                  const controller = iocContainer.get<{{../name}}>({{../name}});
                  {{else}}
                  const controller = new {{../name}}();
                  {{/if}}

                    const promise = controller.{{name}}.apply(controller, validatedArgs);
                    let statusCode: any;
                    if (controller instanceof Controller) {
                        statusCode = (controller as Controller).getStatus();
                    }
                    return promiseHandler(promise, statusCode, request, reply);
                }
            }
        });
    {{/each}}
    {{/each}}

    {{#if useSecurity}}
    function authenticateMiddleware(name: string, scopes: string[] = []) {
      return (request: hapi.Request, reply: hapi.IReply) => {
            hapiAuthentication(request, name, scopes).then((user: any) => {
                set(request, 'user', user);
                reply.continue();
            })
            .catch((error: any) => reply(error).code(error.status || 401));
      }
    }
    {{/if}}

    {{#if useFileUploads}}
    function fileUploadMiddleware(fieldname: string, multiple: boolean = false) {
      return (request: hapi.Request, reply: hapi.IReply) => {
        if (!request.payload[fieldname]) {
          return reply(`${fieldname} is a required file(s).`).code(400);
        }

        const calculateFileInfo = (reqFile: any) => new Promise((resolve, reject) => {
          const originalname = reqFile.hapi.filename;
          const headers = reqFile.hapi.headers;
          const contentTransferEncoding = headers['content-transfer-encoding'];
          const encoding = contentTransferEncoding &&
            contentTransferEncoding[0] &&
            contentTransferEncoding[0].toLowerCase() || '7bit';
          const mimetype = headers['content-type'] || 'text/plain';
          const destination = '{{uploadDirectory}}';
          const filename = crypto.pseudoRandomBytes(16).toString('hex');
          const filePath = path.join(destination, filename);
          return mkdirp(destination, err => {
            if (err) {
              return reject(err);
            }
            const file = fs.createWriteStream(filePath);

            reqFile.pipe(file);

            return reqFile.on('end', (err?: Error) => {
              if (err) {
                return reject(err);
              }
              return fs.stat(filePath, (err, stats) => {
                return resolve({
                  fieldname,
                  originalname,
                  encoding,
                  mimetype,
                  destination,
                  filename,
                  path: filePath,
                  size: stats.size,
                });
              });
            });
          });
        });

        if (!multiple) {
          return calculateFileInfo(request.payload[fieldname])
            .then(fileMetadata => {
              request.payload[fieldname] = fileMetadata;
              return reply.continue();
            })
            .catch(err => reply(err.toString()).code(500));
        } else {
          const promises = request.payload[fieldname].map((reqFile: any) => calculateFileInfo(reqFile));
          return Promise.all(promises)
            .then(filesMetadata => {
              request.payload[fieldname] = filesMetadata;
              return reply.continue();
            })
            .catch(err => reply(err.toString()).code(500));
        }
      };
    }
    {{/if}}

    function promiseHandler(promise: any, statusCode: any, request: hapi.Request, reply: hapi.IReply) {
      return promise
        .then((data: any) => {
          if (data) {
            return reply(data).code(statusCode || 200);
          } else {
            return (reply as any)().code(statusCode || 204);
          }
        })
        .catch((error: any) => reply(error).code(error.status || 500));
    }

    function getValidatedArgs(args: any, request: hapi.Request): any[] {
        const errorFields: FieldErrors = {};
        const values = Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return request;
            case 'query':
                return ValidateParam(args[key], request.query[name], models, name, errorFields);
            case 'path':
                return ValidateParam(args[key], request.params[name], models, name, errorFields);
            case 'header':
                return ValidateParam(args[key], request.headers[name], models, name, errorFields);
            case 'body':
                return ValidateParam(args[key], request.payload, models, name, errorFields);
            case 'body-prop':
                return ValidateParam(args[key], request.payload[name], models, name, errorFields);
            case 'formData':
                return ValidateParam(args[key], request.payload[name], models, name, errorFields);
            }
        });
        if (Object.keys(errorFields).length > 0) {
            throw new ValidateError(errorFields, '');
        }
        return values;
    }
}

