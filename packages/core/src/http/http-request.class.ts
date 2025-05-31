import fs from 'node:fs/promises';
import { join as joinPath } from 'node:path';
import { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { Encrypter } from '../encrypter/encrypter.service.ts';
import { HttpMethod } from './enums/http-method.enum.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { RoutePath } from '../router/types/route-path.type.ts';
import { Router } from '../router/router.service.ts';
import { StateManager } from '../state/state-manager.service.ts';

export class HttpRequest {
  private readonly cspNonce = resolve(Encrypter).generateRandomString(24);

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
    if (this.method() !== HttpMethod.Get || this.path() === '/') {
      return false;
    }

    try {
      await fs.stat(
        joinPath(
          resolve(StateManager).state.staticFilesDirectory,
          this.path().slice(1),
        ),
      );

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

  public get nonce(): string {
    return this.cspNonce;
  }

  public path(): RoutePath {
    return (this.request.url ?? '/') as RoutePath;
  }

  public url(): string {
    return resolve(Router).baseUrl() + this.path();
  }
}
