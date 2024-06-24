import type { OutgoingHttpHeaders } from 'node:http';

type HeaderNames = keyof OutgoingHttpHeaders;
type HeaderValue<H extends HeaderNames> = OutgoingHttpHeaders[H];

export class Controller {
  private statusCode?: number = undefined;
  private headers = {} as { [name: string]: string | string[] | undefined };

  public setStatus(statusCode: number) {
    this.statusCode = statusCode;
  }

  public getStatus() {
    return this.statusCode;
  }

  public setHeader<H extends HeaderNames>(name: H, value?: HeaderValue<H>): void;
  public setHeader(name: string, value?: string | string[]): void;

  public setHeader(name: string, value?: string | string[]) {
    this.headers[name] = value;
  }

  public getHeader(name: string) {
    return this.headers[name];
  }

  public getHeaders() {
    return this.headers;
  }
}
