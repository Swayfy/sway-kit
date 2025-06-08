import http from 'node:http';
import http2 from 'node:http2';
import fsp from 'node:fs/promises';
import { join as joinPath } from 'node:path';
import formidable, { Fields, Files, File } from 'formidable';
import { Encrypter } from '../crypto/encrypter.service.ts';
import { HttpMethod } from './enums/http-method.enum.ts';
import { RequestFile } from './request-file.class.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { RoutePath } from '../router/types/route-path.type.ts';
import { Router } from '../router/router.service.ts';
import { StateManager } from '../state/state-manager.service.ts';

export class Request {
  private readonly cspNonce = resolve(Encrypter).generateRandomString(24);

  private incomingBody: Record<string, any> = {};

  private incomingFiles: Record<string, RequestFile | RequestFile[] | null> =
    {};

  private readonly nativeInstance:
    | http.IncomingMessage
    | http2.Http2ServerRequest;

  constructor(nativeInstance: http.IncomingMessage | http2.Http2ServerRequest) {
    this.nativeInstance = nativeInstance;
  }

  public get body(): Record<string, any> {
    return this.incomingBody;
  }

  public get files(): Record<string, RequestFile | RequestFile[] | null> {
    return this.incomingFiles;
  }

  public file(name: string): RequestFile | RequestFile[] | null {
    return this.files[name];
  }

  public header(name: string): string | undefined {
    if (!this.headers[name]) {
      return undefined;
    }

    return Array.isArray(this.headers[name])
      ? this.headers[name][0]
      : this.headers[name];
  }

  public get headers(): http.IncomingHttpHeaders {
    return this.nativeInstance.headers;
  }

  public input(name: string): string | undefined {
    return this.body[name];
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
      await fsp.stat(
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
        (value) => value === this.nativeInstance.method,
      ) ?? HttpMethod.Get
    );
  }

  public get nonce(): string {
    return this.cspNonce;
  }

  public path(): RoutePath {
    const path = new URL(this.url()).pathname as RoutePath;

    if (path !== '/' && path.endsWith('/')) {
      return path.slice(0, -1) as RoutePath;
    }

    return path;
  }

  public get query(): Record<string, any> {
    const url = new URL(this.url());

    const params = new URLSearchParams(url.search);

    let object: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
      object[key] = value;
    }

    return object;
  }

  public queryParam(param: string): string | null {
    const url = new URL(this.url());

    const params = new URLSearchParams(url.search);

    for (const [key, value] of params.entries()) {
      if (key === param) {
        return value;
      }
    }

    return null;
  }

  public url(): string {
    return resolve(Router).baseUrl() + (this.nativeInstance.url ?? '/');
  }

  public async $load(): Promise<void> {
    return new Promise((resolve) => {
      if (![HttpMethod.Get, HttpMethod.Head].includes(this.method())) {
        if (this.header('content-type')?.includes('json')) {
          let body = '';

          this.nativeInstance.on('data', (chunk: Buffer) => {
            try {
              body += chunk.toString();
            } catch (error) {
              throw new Error('Could not parse incoming request body as JSON');
            }
          });

          this.nativeInstance.on('end', () => {
            this.incomingBody = JSON.parse(body);

            resolve();
          });

          return;
        }

        const form = formidable({
          multiples: true,
          maxFileSize: 200 * 1024 * 1024,
          keepExtensions: true,
          uploadDir: joinPath('node_modules', '.sway-temp'),
        });

        form.parse(
          this.nativeInstance as http.IncomingMessage,
          (error: unknown, fields: Fields, files: Files) => {
            if (error) {
              throw new Error('Could not parse incoming request body');
            }

            this.incomingBody = { ...fields };

            this.incomingFiles = Object.fromEntries(
              Object.entries(files).map(([name, file]) => {
                if (file) {
                  const value = Array.isArray(file)
                    ? file.map((singleFile) => new RequestFile(singleFile))
                    : new RequestFile(file);

                  return [name, value];
                }

                return [name, null];
              }),
            );
          },
        );
      }

      resolve();
    });
  }
}
