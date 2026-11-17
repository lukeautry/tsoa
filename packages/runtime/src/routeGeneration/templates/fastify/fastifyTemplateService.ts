import type { FastifyRequest, FastifyReply } from 'fastify';
import { Readable } from 'stream';
import type { File } from '../../../interfaces/file';

import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';

type FastifyApiHandlerParameters = {
  methodName: string;
  controller: Controller | object;
  request: FastifyRequest;
  reply: FastifyReply;
  validatedArgs: any[];
  successStatus?: number;
};

type FastifyValidationArgsParameters = {
  args: Record<string, TsoaRoute.ParameterSchema>;
  request: FastifyRequest;
  reply: FastifyReply;
};

type MemoryFile = Pick<File, 'fieldname' | 'originalname' | 'encoding' | 'mimetype' | 'size' | 'buffer'>;

type MultipartPart =
  | { type: 'file'; fieldname: string; filename: string; encoding: string; mimetype: string; file: { truncated: boolean }; toBuffer(): Promise<Buffer> }
  | { type: 'field'; fieldname: string; value: unknown; valueTruncated: boolean; fieldnameTruncated: boolean };

type MultipartRequest = FastifyRequest & {
  isMultipart(): boolean;
  parts(): AsyncIterable<MultipartPart>;
  server: { multipartErrors: { RequestFileTooLargeError: new () => Error } };
};

type FastifyReturnHandlerParameters = {
  request: FastifyRequest;
  reply: FastifyReply;
  headers: any;
  statusCode?: number;
  data?: any;
};

/** Sets `status` and `statusCode` without changing how existing properties are described. Returns undefined when the target refuses. */
function setStatus<T extends object>(target: T, status: number): (T & { status: number; statusCode: number }) | undefined {
  try {
    for (const key of ['status', 'statusCode'] as const) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        (target as Record<string, unknown>)[key] = status;
        if ((target as Record<string, unknown>)[key] !== status) return undefined;
      } else {
        Object.defineProperty(target, key, { value: status, writable: true, configurable: true, enumerable: true });
      }
    }
    return target as T & { status: number; statusCode: number };
  } catch {
    return undefined;
  }
}

/** A client mistake in a multipart body. `code` and `statusCode` follow the errors @fastify/multipart throws. */
function multipartError(code: string, message: string, statusCode: number): Error & { code: string; statusCode: number } {
  return Object.assign(new Error(message), { code, statusCode });
}

export class FastifyTemplateService extends TemplateService<FastifyApiHandlerParameters, FastifyValidationArgsParameters, FastifyReturnHandlerParameters> {
  private readonly files = new WeakMap<FastifyRequest, Record<string, MemoryFile[]>>();
  private readonly replies = new WeakMap<FastifyReply, { started: boolean }>();

  /** Records when a response starts, so later steps can tell an answered request apart. Part of the contract between generated routes and the runtime; application code does not need to call it. */
  initializeReply(reply: FastifyReply): void {
    if (this.replies.has(reply)) return;
    const state = { started: false };
    this.replies.set(reply, state);
    const send = reply.send.bind(reply);
    reply.send = payload => {
      // Fastify can send again during error recovery; observe rather than suppress those calls.
      const result = send(payload);
      state.started = true;
      return result;
    };
  }

  /** Whether a response was sent or has started sending for this request. Part of the contract between generated routes and the runtime; application code does not need to call it. */
  hasResponseStarted(reply: FastifyReply): boolean {
    return reply.sent || this.replies.get(reply)?.started === true;
  }

  /**
   * Turns the failure that authentication reports into the error the generated routes throw to Fastify's
   * error handler. Part of the contract between generated routes and the runtime; application code does
   * not need to call it.
   *
   * - The status is the failure's `status`, then its `statusCode` (as @fastify/error sets it), if it is an
   *   integer from 400 to 599. Otherwise it is 401.
   * - An Error is passed on itself, so `instanceof` checks and its stack still work. `status` and
   *   `statusCode` are set on it: assigned when writable, defined when absent. When it refuses them
   *   (frozen, or read-only), an object that inherits from it carries them instead; that object is not a
   *   native error for `util.types.isNativeError`.
   * - Any other value is wrapped in an Error. Its `cause` is the rejected value, except that a null or
   *   undefined rejection arrives as an empty object. A string rejection is also the message.
   */
  authenticationError(failure: { message?: unknown; status?: unknown; statusCode?: unknown }): Error & { status: number; statusCode: number } {
    const isErrorStatus = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 400 && (value as number) <= 599;
    const status = isErrorStatus(failure.status) ? failure.status : isErrorStatus(failure.statusCode) ? failure.statusCode : 401;
    if (failure instanceof Error) {
      return setStatus(failure, status) ?? (setStatus(Object.create(failure) as Error, status) as Error & { status: number; statusCode: number });
    }
    // failureToReport boxes primitive rejections with Object(); unwrap them so `cause` is the rejected value.
    const cause = failure instanceof String || failure instanceof Number || failure instanceof Boolean ? failure.valueOf() : failure;
    const message = typeof failure.message === 'string' ? failure.message : typeof cause === 'string' ? cause : '';
    return setStatus(Object.assign(new Error(message), { cause }), status) as Error & { status: number; statusCode: number };
  }

  private responseCompletion(reply: FastifyReply): Promise<void> {
    const completion = new Promise<void>((resolve, reject) => reply.then(resolve, reject));
    void completion.catch(() => undefined);
    return completion;
  }

  async apiHandler(params: FastifyApiHandlerParameters) {
    const { methodName, controller, request, reply, validatedArgs, successStatus } = params;
    this.initializeReply(reply);
    if (this.hasResponseStarted(reply)) return this.responseCompletion(reply);

    let data;
    try {
      data = await this.buildPromise(methodName, controller, validatedArgs);
    } catch (error) {
      if (!this.hasResponseStarted(reply)) throw error;
      reply.log.error({ err: error }, 'Controller failed after sending a response');
      return this.responseCompletion(reply);
    }
    if (this.hasResponseStarted(reply)) return this.responseCompletion(reply);
    let statusCode = successStatus;
    let headers;
    if (this.isController(controller)) {
      headers = controller.getHeaders();
      statusCode = controller.getStatus() || statusCode;
    }
    return this.returnHandler({ request, reply, headers, statusCode, data });
  }

  getValidatedArgs(params: FastifyValidationArgsParameters): any[] {
    const { args, request, reply } = params;
    this.initializeReply(reply);

    const errorFields: FieldErrors = {};
    const values = this.getParameters(args).map(param => {
      const name = param.name;
      switch (param.in) {
        case 'request':
          return request;
        case 'request-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(request, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, false, undefined);
        }
        case 'query':
          return this.validationService.ValidateParam(param, (request.query as Record<string, unknown>)[name], name, errorFields, false, undefined);
        case 'queries':
          return this.validationService.ValidateParam(param, request.query, name, errorFields, false, undefined);
        case 'path':
          return this.validationService.ValidateParam(param, (request.params as Record<string, unknown>)[name], name, errorFields, false, undefined);
        case 'header':
          return this.validationService.ValidateParam(param, request.headers[name], name, errorFields, false, undefined);
        case 'body': {
          if (param.dataType === 'binary') {
            if (request.body === undefined) return Readable.from([]);
            if (request.body instanceof Readable && !request.body.readableEnded) return request.body;
            errorFields[name] = { message: 'request body was already consumed by a body parser' };
            return undefined;
          }
          const descriptor = Object.getOwnPropertyDescriptor(request, 'body');
          const value = descriptor ? descriptor.value : undefined;
          const bodyFieldErrors: FieldErrors = {};
          const result = this.validationService.ValidateParam(param, value, name, bodyFieldErrors, true, undefined);
          Object.keys(bodyFieldErrors).forEach(key => {
            errorFields[key] = { message: bodyFieldErrors[key].message };
          });
          return result;
        }
        case 'body-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(request, 'body');
          const value = descriptor?.value?.[name];
          const bodyFieldErrors: FieldErrors = {};
          const result = this.validationService.ValidateParam(param, value, name, bodyFieldErrors, true, 'body.');
          Object.keys(bodyFieldErrors).forEach(key => {
            errorFields[key] = { message: bodyFieldErrors[key].message };
          });
          return result;
        }
        case 'formData': {
          const body = request.body as Record<string, unknown> | undefined;
          if (param.dataType === 'file' || (param.dataType === 'array' && param.array && param.array.dataType === 'file')) {
            const fileArgs = this.validationService.ValidateParam(param, this.files.get(request)?.[name], name, errorFields, false, undefined);
            if (param.dataType === 'array') {
              return fileArgs;
            }
            return Array.isArray(fileArgs) && fileArgs.length === 1 ? fileArgs[0] : fileArgs;
          }
          return this.validationService.ValidateParam(param, body?.[name], name, errorFields, false, undefined);
        }
        case 'res':
          return (status: number | undefined, data: any, headers: any): Promise<void> => this.returnHandler({ request, reply, headers, statusCode: status, data });
      }
    });
    if (this.hasFieldErrors(errorFields)) {
      throw new ValidateError(errorFields, JSON.stringify({ fields: errorFields }));
    }
    return values;
  }

  /** Reads a multipart body into `request.body` and the uploaded files for `getValidatedArgs`. Rejects a file under an undeclared field or past `maxCount` with 400, and a truncated field or file with 413. Part of the contract between generated routes and the runtime; application code does not need to call it. */
  async collectMultipart(request: MultipartRequest, fields: ReadonlyArray<{ name: string; maxCount?: number }>): Promise<void> {
    if (!request.isMultipart()) return;
    const files: Record<string, MemoryFile[]> = Object.create(null);
    const body: Record<string, unknown> = Object.create(null);
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const field = fields.find(field => field.name === part.fieldname);
        if (!field || (field.maxCount && files[part.fieldname]?.length >= field.maxCount)) {
          throw multipartError('FST_TSOA_UNEXPECTED_FILE_FIELD', 'Unexpected field', 400);
        }
        const buffer = await part.toBuffer();
        // With throwFileSizeLimit: false the plugin hands back a silently truncated buffer.
        if (part.file.truncated) throw new request.server.multipartErrors.RequestFileTooLargeError();
        (files[part.fieldname] ||= []).push({
          fieldname: part.fieldname,
          originalname: part.filename,
          encoding: part.encoding,
          mimetype: part.mimetype,
          size: buffer.length,
          buffer,
        });
      } else {
        if (part.valueTruncated || part.fieldnameTruncated) throw multipartError('FST_TSOA_FIELD_TOO_LONG', 'Field value too long', 413);
        const previous = body[part.fieldname];
        body[part.fieldname] = previous === undefined ? part.value : [...(Array.isArray(previous) ? previous : [previous]), part.value];
      }
    }
    request.body = body;
    this.files.set(request, files);
  }

  protected returnHandler(params: FastifyReturnHandlerParameters) {
    const { reply, statusCode, data, headers } = params;
    if (this.hasResponseStarted(reply)) return this.responseCompletion(reply);
    reply.headers(headers || {});
    const mediaType = String(reply.getHeader('content-type') || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    const isJson = mediaType.includes('json');
    // Like Express: no data sends an empty body with 204, and null under a JSON content type is JSON null with 200.
    const hasBody = data !== undefined && (data !== null || isJson);
    reply.code(statusCode || (hasBody ? 200 : 204));
    const emptyResponse = reply.statusCode === 204 || reply.statusCode === 205 || reply.statusCode === 304;
    let body = emptyResponse || !hasBody ? undefined : data;
    if (body instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && body instanceof SharedArrayBuffer)) {
      // Fastify sends typed arrays and Buffers as bytes, but rejects a bare ArrayBuffer.
      body = Buffer.from(body);
    } else if (ArrayBuffer.isView(body) && !(body.buffer instanceof ArrayBuffer)) {
      // Fastify sends a view only over an ArrayBuffer; copy a view over a SharedArrayBuffer.
      body = Buffer.from(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
    } else if (body !== undefined && mediaType && !isJson && typeof body !== 'string' && !this.isRawPayload(body)) {
      body = JSON.stringify(body);
    }
    reply.send(body);
    return this.responseCompletion(reply);
  }

  /** Payloads Fastify sends as they are: Buffers, typed arrays, DataViews, Node and web streams, and fetch Responses, which set their own status and headers. */
  private isRawPayload(body: unknown): boolean {
    if (typeof body !== 'object' || body === null) return false;
    if (ArrayBuffer.isView(body)) return true;
    const candidate = body as { pipe?: unknown; getReader?: unknown };
    return typeof candidate.pipe === 'function' || typeof candidate.getReader === 'function' || Object.prototype.toString.call(body) === '[object Response]';
  }
}
