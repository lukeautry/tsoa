import { IsValidHeader } from '../utils/isHeaderType';

export type HttpStatusCodeLiteral =
  | 100
  | 101
  | 102
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226
  | 300
  | 301
  | 302
  | 303
  | 304
  | 305
  | 307
  | 308
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 422
  | 423
  | 424
  | 426
  | 428
  | 429
  | 431
  | 451
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511;

export type HttpStatusCodeStringLiteral = `${HttpStatusCodeLiteral}`;

export type OtherValidOpenApiHttpStatusCode = '1XX' | '2XX' | '3XX' | '4XX' | '5XX' | 'default';

export type TsoaResponse<T extends HttpStatusCodeLiteral, BodyType, HeaderType extends IsValidHeader<HeaderType> = {}> = (status: T, data: BodyType, headers?: HeaderType) => any;
