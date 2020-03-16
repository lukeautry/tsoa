import { Response } from 'express-serve-static-core';

type HttpStatusCodeLiteral =
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
  | 421
  | 422
  | 423
  | 424
  | 426
  | 428
  | 429
  | 431
  | 444
  | 451
  | 499
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
  | 511
  | 599;

export interface TsoaResponse<T extends HttpStatusCodeLiteral, U> extends Response<U> {
  /**
   * Set status `code`.
   */
  status(code: T): this;

  /**
   * Set the response HTTP status code to `statusCode` and send its string representation as the response body.
   * @link http://expressjs.com/4x/api.html#res.sendStatus
   *
   * Examples:
   *
   *    res.sendStatus(200); // equivalent to res.status(200).send('OK')
   *    res.sendStatus(403); // equivalent to res.status(403).send('Forbidden')
   *    res.sendStatus(404); // equivalent to res.status(404).send('Not Found')
   *    res.sendStatus(500); // equivalent to res.status(500).send('Internal Server Error')
   */
  sendStatus(code: T): this;
}
