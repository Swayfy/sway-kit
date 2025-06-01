import fs from 'node:fs';
import fse from 'node:fs/promises';
import {join as joinPath} from 'node:path';
import { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import formidable, { Fields, Files, File } from 'formidable';
import { Encrypter } from '../encrypter/encrypter.service.ts';
import { HttpMethod } from './enums/http-method.enum.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { RoutePath } from '../router/types/route-path.type.ts';
import { Router } from '../router/router.service.ts';
import { StateManager } from '../state/state-manager.service.ts';

// @ts-ignore
File.prototype.store = async (path: string, name?: string) => {
  const parts = path.split('.');

  const directory = joinPath(...parts);

  if (!fs.existsSync(directory)) {
    await fse.mkdir(directory, {
      recursive: true,
    });
  }

  // @ts-ignore
  const { newFilename, filepath } = this;

  const fileName = name
    ? `${name}.${newFilename.split('.').pop()}`
    : newFilename;

  path = joinPath(directory, fileName);

  await fse.rename(filepath, path);

  // @ts-ignore
  this.filepath = path;
};

export class Request {
  private readonly cspNonce = resolve(Encrypter).generateRandomString(24);

  private incomingBody: Record<string, any> = {};

  private incomingFiles: Record<string, File | File[]> = {};

  private readonly nativeInstance: IncomingMessage;

  constructor(nativeInstance: IncomingMessage) {
    this.nativeInstance = nativeInstance;
  }

  public get body(): Record<string, any> {
    return this.incomingBody;
  }

  public get files(): Record<string, File | File[]> {
    return this.incomingFiles;
  }

  public file(name: string): File | File[] | undefined {
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

  public get headers(): IncomingHttpHeaders {
    return this.nativeInstance.headers;
  }

  public input(name: string): string | undefined {
    return this.body[name]
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
      await fse.stat(
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
    return new URL(this.url()).pathname as RoutePath;
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

  public async onReady(): Promise<void> {
    return new Promise((resolve) => {
      if (![HttpMethod.Get, HttpMethod.Head].includes(this.method())) {
        if (this.header('content-type')?.includes('json')) {
          let body = '';

          this.nativeInstance.on('data', (chunk: Buffer) => {
            try {
              body += chunk.toString();
            } catch (error) {
              throw new Error('Cannot parse incoming request body as JSON');
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
          this.nativeInstance,
          (error: any, fields: Fields, files: Files) => {
            if (error) {
              throw new Error('Cannot parse incoming request body');
            }

            this.incomingBody = { ...fields };
            this.incomingFiles = { ...files } as Record<string, File | File[]>;
          },
        );
      }
    });
  }
}
