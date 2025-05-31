import fs from 'node:fs/promises';
import { join, join as joinPath } from 'node:path';
import { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { HttpMethod } from './enums/http-method.enum.ts';
import { RoutePath } from '../router/types/route-path.type.ts';

export class HttpRequest {
  private readonly request: IncomingMessage;

  constructor(request: IncomingMessage) {
    this.request = request;
  }

  public header(name: string): string | undefined {
    if (!this.headers[name]) {
      return undefined;
    }

    return Array.isArray(this.headers[name])
      ? this.headers[name][0]
      : this.headers[name];
  }

  public get headers(): IncomingHttpHeaders {
    return this.request.headers;
  }

  public isAjaxRequest(): boolean {
    return !!(
      this.header('x-requested-with')?.toLowerCase() === 'xmlhttprequest' ||
      this.header('accept')?.includes('application/json')
    );
  }

  public isFormRequest(): boolean {
    return (
      !!this.headers['content-type'] &&
      ![
        HttpMethod.Get,
        HttpMethod.Head,
        HttpMethod.PropFind,
        HttpMethod.Search,
      ].includes(this.method())
    );
  }

  public isMultipartRequest(): boolean {
    return (
      this.isFormRequest() &&
      !!this.header('content-type')?.includes('multipart/form-data')
    );
  }

  public async isStaticFileRequest(): Promise<boolean> {
    if (this.path() === '/') {
      return false;
    }

    try {
      await fs.stat(joinPath('public', this.path().slice(1)));

      return true;
    } catch {
      return false;
    }
  }

  public method(): HttpMethod {
    return (
      Object.values(HttpMethod).find(
        (value) => value === this.request.method,
      ) ?? HttpMethod.Get
    );
  }

  public path(): RoutePath {
    return new URL(this.request.url ?? '/').pathname as RoutePath;
  }

  public url(): string {
    return this.request.url ?? '/';
  }
}
