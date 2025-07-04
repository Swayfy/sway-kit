import fs from 'node:fs/promises';
import path from 'node:path';
import { Constructor } from '../utils/interfaces/constructor.interface.ts';
import { CONTENT_TYPES } from './constants.ts';
import { Controller } from './controller.class.ts';
import { DownloadResponse } from '../http/download-response.class.ts';
import { ErrorHandler } from '../error/error-handler.service.ts';
import { HtmlResponse } from '../http/html-response.class.ts';
import { HttpError } from '../http/http-error.class.ts';
import { HttpMethod } from '../http/enums/http-method.enum.ts';
import { HttpStatus } from '../http/enums/http-status.enum.ts';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { JsonResponse } from '../http/json-response.class.ts';
import { EnumValuesUnion } from '../utils/types/enum-values-union.type.ts';
import { MethodDecorator } from '../utils/types/method-decorator.type.ts';
import { Middleware } from './interfaces/middleware.interface.ts';
import { RedirectBackResponse } from '../http/redirect-back-response.class.ts';
import { RedirectResponse } from '../http/redirect-response.class.ts';
import { Reflector } from '../utils/reflector.class.ts';
import { Request } from '../http/request.class.ts';
import { Response } from '../http/response.class.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { Route } from './interfaces/route.interface.ts';
import { RouteOptions } from './interfaces/route-options.interface.ts';
import { RoutePath } from './types/route-path.type.ts';
import { StateManager } from '../state/state-manager.service.ts';
import { TimeUnit } from '../utils/enums/time-unit.enum.ts';
import { Url } from './types/url.type.ts';
import { ViewRenderer } from '../view/view-renderer.service.ts';
import { ViewResponse } from '../http/view-response.class.ts';

interface ResponseOptions {
  cookies?: Record<string, string>;
  headers?: HeadersInit;
  statusCode?: HttpStatus;
}

type RouteDecoratorFunction<THttpMethods> =
  THttpMethods extends EnumValuesUnion<HttpMethod>[]
    ? (path: RoutePath, options?: RouteOptions) => MethodDecorator
    : (
        methods: EnumValuesUnion<HttpMethod>[],
        path: RoutePath,
        options?: RouteOptions,
      ) => MethodDecorator;

type ContentType = `${string}/${string}`;

@Inject([ErrorHandler, StateManager, ViewRenderer])
export class Router {
  private readonly urlRegexp =
    /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;

  private httpErrorHandler?: (
    statusCode: HttpStatus,
    message: string,
  ) => unknown;

  constructor(
    private readonly errorHandler: ErrorHandler,
    private readonly stateManager: StateManager,
    private readonly viewRenderer: ViewRenderer,
  ) {}

  private readonly routes: Route[] = [];

  private async createResponse(
    request: Request,
    body: unknown,
    {
      cookies = {},
      headers = {},
      statusCode = HttpStatus.Ok,
    }: ResponseOptions = {},
  ): Promise<Response> {
    const cspDirectives = ` ${this.stateManager.state.contentSecurityPolicy.allowedOrigins.join(
      ' ',
    )} ${
      this.stateManager.state.isProduction
        ? ''
        : `${
            this.stateManager.state.tls.enabled ? 'https' : 'http'
          }://${this.stateManager.state.host}:* ${
            this.stateManager.state.tls.enabled ? 'wss' : 'ws'
          }://${this.stateManager.state.host}:*`
    }`;

    const csp = {
      'base-uri': `'self'`,
      'connect-src': `'self' 'nonce-${request.nonce}' ${cspDirectives}`,
      'default-src': `'self' 'nonce-${request.nonce}' ${cspDirectives}`,
      'font-src': `'self' 'nonce-${request.nonce}' ${cspDirectives} https: data:`,
      'form-action': `'self'`,
      'frame-ancestors': `'self'`,
      'img-src': '*',
      'media-src': `'self'`,
      'object-src': `'none'`,
      'script-src': `'self' ${
        this.stateManager.state.contentSecurityPolicy.allowInlineScripts
          ? `'unsafe-inline'`
          : `'nonce-${request.nonce}'`
      } ${cspDirectives}`,
      'script-src-attr': `'${
        this.stateManager.state.contentSecurityPolicy.allowInlineScripts
          ? 'unsafe-inline'
          : 'none'
      }'`,
      'style-src': `'self' ${
        this.stateManager.state.contentSecurityPolicy.allowInlineStyles
          ? `'unsafe-inline'`
          : `'nonce-${request.nonce}'`
      } ${cspDirectives}`,
      'upgrade-insecure-requests': '',
    };

    const corsHeaders = {
      'access-control-allow-credentials': String(
        this.stateManager.state.cors.allowCredentials,
      ),
      'access-control-allow-headers': this.stateManager.state.cors
        .allowedHeaders.length
        ? this.stateManager.state.cors.allowedHeaders.join(',')
        : (request.header('access-control-request-headers') ?? ''),
      ...(this.stateManager.state.cors.allowedMethods.length && {
        'access-control-allow-methods':
          this.stateManager.state.cors.allowedMethods.join(','),
      }),
      ...(((this.stateManager.state.cors.allowedOrigins.length &&
        this.stateManager.state.cors.allowedOrigins.includes(
          request.header('origin') ?? '',
        )) ||
        this.stateManager.state.cors.allowedOrigins[0] === '*') && {
        'access-control-allow-origin':
          this.stateManager.state.cors.allowedOrigins[0] === '*'
            ? '*'
            : request.header('origin'),
      }),
      ...(this.stateManager.state.cors.exposedHeaders.length && {
        'access-control-expose-headers':
          this.stateManager.state.cors.exposedHeaders.join(','),
      }),
      'access-control-max-age': String(this.stateManager.state.cors.maxAge),
      ...(!this.stateManager.state.cors.allowedMethods.includes('*') && {
        vary: 'origin',
      }),
    };

    const securityHeaders = {
      ...(this.stateManager.state.contentSecurityPolicy.enabled && {
        'content-security-policy': Object.entries(csp)
          .map(([key, value]) => `${key} ${value}`)
          .join(';'),
      }),
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'origin-agent-cluster': '?1',
      'permissions-policy':
        'autoplay=(self), camera=(), encrypted-media=(self), geolocation=(self), microphone=(), payment=(), sync-xhr=(self)',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-dns-prefetch-control': 'off',
      'x-download-options': 'noopen',
      'x-xss-protection': '0',
      ...corsHeaders,
    };

    const {
      additionalCookies,
      additionalHeaders,
      body: parsedBody,
      contentType,
      statusCode: finalStatusCode,
    } = await this.parseResponseBody(request, body);

    const baseHeaders = {
      'content-type': `${contentType}; charset=utf-8`,
      'cache-control':
        this.stateManager.state.cache.enabled &&
        (await request.isStaticFileRequest())
          ? `max-age=${
              (this.stateManager.state.cache.maxAge * 24 * TimeUnit.Hour) / 1000
            }`
          : 'no-cache',
      ...this.stateManager.state.globalHeaders,
      ...additionalHeaders,
    };

    const response = new Response(
      parsedBody,
      new Headers({
        ...baseHeaders,
        ...securityHeaders,
        ...headers,
      }),
      finalStatusCode === statusCode &&
      parsedBody === null &&
      request.method() !== HttpMethod.Options
        ? HttpStatus.NoContent
        : (finalStatusCode ?? statusCode),
    );

    for (const [cookie, cookieValue] of Object.entries({
      ...cookies,
      ...additionalCookies,
    })) {
      response.headers.append(
        'set-cookie',
        `${cookie}=${cookieValue}; SameSite=Lax; Max-Age=${
          (this.stateManager.state.cookies.maxAge * 24 * TimeUnit.Hour) / 1000
        }`,
      );
    }

    return response;
  }

  private async createStaticFileResponse(request: Request): Promise<Response> {
    const filePath = path.join(
      this.stateManager.state.staticFilesDirectory,
      ...request.path().split('/'),
    );

    try {
      const fileSize = (await fs.stat(filePath)).size;
      const body = new Uint8Array(await fs.readFile(filePath));

      return await this.createResponse(request, body, {
        headers: {
          'content-length': fileSize.toString(),
          'content-type':
            CONTENT_TYPES[
              (filePath.split('.')?.pop() ?? '') as keyof typeof CONTENT_TYPES
            ]?.[0] ?? 'application/octet-stream',
        },
      });
    } catch {
      throw new HttpError(HttpStatus.NotFound);
    }
  }

  private async parseResponseBody(
    request: Request,
    body: unknown,
    statusCode?: HttpStatus,
  ): Promise<{
    additionalCookies: Record<string, string>;
    additionalHeaders: Record<string, string>;
    body: string | null | Uint8Array;
    contentType: ContentType;
    statusCode?: HttpStatus;
  }> {
    let additionalCookies: Record<string, string> = {};
    let additionalHeaders: Record<string, string> = {};

    let contentType: ContentType = 'text/html';

    if (body instanceof Promise) {
      body = await body;
    }

    if (body instanceof Response) {
      statusCode = body.statusCode;
      body = body.content;
    }

    if (body !== null) {
      switch (true) {
        case ['bigint', 'boolean', 'number', 'string', 'symbol'].includes(
          typeof body,
        ): {
          body = String(body);

          break;
        }

        case typeof body === 'undefined': {
          body = null;

          break;
        }

        case Array.isArray(body) ||
          (typeof body === 'object' &&
            body !== null &&
            (body as Record<string, unknown>).constructor === Object): {
          body = JSON.stringify(body);
          contentType = 'application/json';

          break;
        }

        case body instanceof DownloadResponse: {
          additionalHeaders['content-disposition'] = `attachment; filename="${
            body.filename ?? 'download'
          }"`;

          if (body.statusCode) {
            statusCode = body.statusCode;
          }

          additionalCookies = { ...additionalCookies, ...body.cookies };

          body = JSON.stringify(body.content);
          contentType = 'application/octet-stream';

          break;
        }

        case body instanceof HtmlResponse: {
          if (body.statusCode) {
            statusCode = body.statusCode;
          }

          additionalCookies = { ...additionalCookies, ...body.cookies };

          body = String(body.content);
          contentType = 'text/html';

          break;
        }

        case body instanceof JsonResponse: {
          if (body.statusCode) {
            statusCode = body.statusCode;
          }

          additionalCookies = { ...additionalCookies, ...body.cookies };

          body = JSON.stringify(body.content);
          contentType = 'application/json';

          break;
        }

        case body instanceof RedirectBackResponse: {
          statusCode = body.statusCode ?? HttpStatus.Found;

          additionalCookies = { ...additionalCookies, ...body.cookies };

          const fallback = body.fallback ?? '/';
          const referrer = request.header('referer');

          if (referrer) {
            additionalHeaders['location'] = referrer;
          } else {
            additionalHeaders['location'] = this.urlRegexp.test(fallback)
              ? fallback
              : `${this.baseUrl()}${fallback}`;
          }

          break;
        }

        case body instanceof RedirectResponse: {
          statusCode = body.statusCode ?? HttpStatus.Found;

          additionalCookies = { ...additionalCookies, ...body.cookies };

          const destination = (body as RedirectResponse).destination;

          additionalHeaders['location'] = this.urlRegexp.test(destination)
            ? destination
            : `${this.baseUrl()}${destination}`;

          break;
        }

        case body instanceof ViewResponse: {
          if (body.statusCode) {
            statusCode = body.statusCode;
          }

          additionalCookies = { ...additionalCookies, ...body.cookies };

          await body.assertFileExists();

          const template = await body.content();

          body = await this.viewRenderer.render(
            template,
            body.data,
            body.view,
            request,
          );

          contentType = 'text/html';

          break;
        }

        case body instanceof Buffer: {
          body = new Uint8Array(body);
          contentType = 'application/octet-stream';

          break;
        }

        case body instanceof Uint8Array: {
          contentType = 'application/octet-stream';

          break;
        }

        default: {
          throw new Error('Invalid response type');
        }
      }
    }

    return {
      additionalCookies,
      additionalHeaders,
      body: body as string | null | Uint8Array,
      contentType,
      statusCode,
    };
  }

  private resolveRoutePath(prefix: RoutePath, path: RoutePath): RoutePath {
    return prefix === '/'
      ? path
      : (`${prefix}${
          path[0] !== '/' && prefix.endsWith('/') ? '/' : ''
        }${path !== '/' ? path : ''}` as RoutePath);
  }

  public baseUrl(): Url {
    return `${
      this.stateManager.state.tls.enabled ? 'https' : 'http'
    }://${this.stateManager.state.host}${
      this.stateManager.state.isProduction
        ? ''
        : `:${this.stateManager.state.port}`
    }`;
  }

  public createRouteDecorator<
    THttpMethods extends EnumValuesUnion<HttpMethod>[] | undefined = undefined,
  >(httpMethods?: THttpMethods): RouteDecoratorFunction<THttpMethods> {
    const decoratorCallback = (
      path: RoutePath,
      methods: EnumValuesUnion<HttpMethod>[],
      options: RouteOptions = {},
    ): MethodDecorator => {
      return (originalMethod, context) => {
        if (context.private) {
          throw new Error(
            `Controller route method "${
              context.name as string
            }" must be public`,
          );
        }

        if (context.static) {
          throw new Error(
            `Controller route method "${
              context.name as string
            }" cannot be static`,
          );
        }

        Reflector.defineMetadata<Partial<Route>>(
          'routeDefinition',
          {
            methods,
            path,
            ...options,
          },
          originalMethod,
        );

        return originalMethod;
      };
    };

    return (
      Array.isArray(httpMethods)
        ? (path: RoutePath, options: RouteOptions = {}) => {
            return decoratorCallback(path, httpMethods, options);
          }
        : (
            methods: EnumValuesUnion<HttpMethod>[],
            path: RoutePath,
            options: RouteOptions = {},
          ) => {
            return decoratorCallback(path, methods, options);
          }
    ) as RouteDecoratorFunction<THttpMethods>;
  }

  public registerController(controller: Constructor<Controller>): void {
    const controllerInstance = resolve(controller);

    const controllerProperties = Object.getOwnPropertyNames(
      Object.getPrototypeOf(controllerInstance),
    );

    const controllerRouteMethods = controllerProperties.filter((property) => {
      return (
        property !== 'constructor' &&
        property[0] !== '_' &&
        typeof Object.getPrototypeOf(controllerInstance)[property] ===
          'function'
      );
    });

    for (const controllerRouteMethod of controllerRouteMethods) {
      const controllerMethodRef = Object.getPrototypeOf(controllerInstance)[
        controllerRouteMethod
      ] as (...args: unknown[]) => unknown;

      const handler = Reflector.getMetadata<boolean>(
        'httpErrorHandler',
        controllerMethodRef,
      );

      if (handler) {
        if (this.httpErrorHandler) {
          throw new Error('Route error handler has already been defined');
        }

        this.httpErrorHandler = (statusCode: HttpStatus, message: string) => {
          const methodResult = controllerMethodRef.call(
            controllerInstance,
            statusCode,
            message,
          );

          return methodResult;
        };

        continue;
      }

      const routeDefinition = Reflector.getMetadata<Exclude<Route, 'action'>>(
        'routeDefinition',
        controllerMethodRef,
      )!;

      const prefix =
        Reflector.getMetadata<RoutePath>('prefix', controller) ?? '/';

      this.registerRoute(
        this.resolveRoutePath(prefix, routeDefinition.path),
        routeDefinition.methods,
        (...args: unknown[]) => {
          const methodResult = controllerMethodRef.call(
            controllerInstance,
            ...args,
          );

          return methodResult;
        },
        {
          cookies:
            Reflector.getMetadata<Record<string, string>>(
              'cookies',
              controllerMethodRef,
            ) ??
            routeDefinition.cookies ??
            {},
          cors:
            Reflector.getMetadata<boolean>('cors', controllerMethodRef) ??
            Reflector.getMetadata<boolean>('cors', controller) ??
            routeDefinition.cors ??
            false,
          headers:
            Reflector.getMetadata<Record<string, string>>(
              'headers',
              controllerMethodRef,
            ) ??
            routeDefinition.headers ??
            {},
          middleware:
            Reflector.getMetadata<Constructor<Middleware>[]>(
              'middleware',
              controllerMethodRef,
            ) ??
            Reflector.getMetadata<Constructor<Middleware>[]>(
              'middleware',
              controller,
            ),
          view: Reflector.getMetadata<string>('view', controllerMethodRef),
        },
      );
    }
  }

  public async respond(request: Request): Promise<Response> {
    try {
      const requestMethod = request.method();

      for (const route of this.routes) {
        if (!route.methods.includes(requestMethod)) {
          continue;
        }

        const urlPattern = new URLPattern({
          pathname: route.path,
        });

        for (const method of route.methods) {
          if (requestMethod === method && urlPattern.test(request.path())) {
            if (route.view) {
              return await this.createResponse(
                request,
                new ViewResponse(route.view),
                {
                  cookies: route.cookies,
                  headers: route.headers,
                  statusCode: route.statusCode,
                },
              );
            }

            const paramGroups =
              urlPattern.exec(request.path())?.pathname.groups ?? {};

            for (const [paramName, paramValue] of Object.entries(paramGroups)) {
              if (paramValue === '') {
                paramGroups[paramName] = undefined;
              }
            }

            const resolvedParams = Object.values(paramGroups);

            if (route.middleware) {
              for (const middlewareRef of route.middleware) {
                const middlewareResult = resolve(middlewareRef).handle(
                  resolvedParams as string[],
                  request,
                );

                if (middlewareResult instanceof Promise) {
                  await middlewareResult;
                }
              }
            }

            return await this.createResponse(
              request,
              route.action(resolvedParams, request),
              {
                cookies: route.cookies,
                headers: route.headers,
                statusCode: route.statusCode,
              },
            );
          }
        }
      }

      if (await request.isStaticFileRequest()) {
        return await this.createStaticFileResponse(request);
      }

      throw new HttpError(HttpStatus.NotFound);
    } catch (error) {
      if (error instanceof HttpError || this.stateManager.state.isProduction) {
        const statusCode =
          error instanceof HttpError
            ? error.statusCode
            : HttpStatus.InternalServerError;

        if (request.isAjaxRequest()) {
          return await this.createResponse(
            request,
            {
              error: (error as Error | HttpError).message,
              statusCode,
            },
            {
              statusCode,
            },
          );
        }

        if (this.httpErrorHandler) {
          const content = this.httpErrorHandler(
            statusCode,
            (error as Error | HttpError).message,
          );

          return await this.createResponse(request, content, {
            statusCode,
          });
        }

        return await this.createResponse(request, null, {
          statusCode,
        });
      }

      const { file, line, symbol } = this.errorHandler.handle(error as Error);

      let fileContent: string | undefined;

      try {
        fileContent = await fs.readFile(file ?? '', 'utf8');
      } catch {
        fileContent = undefined;
      }

      return await this.createResponse(
        request,
        new ViewResponse('@node_modules/@sway-kit/core/views/error', {
          message: (error as Error).message,
          codeSnippet: fileContent
            ?.split('\n')
            .map(
              (codeLine, index) =>
                `<code${++index === line ? ' class="error-highlight"' : ''}><span class="line-number">${index}</span> ${codeLine}</code>`,
            )
            .slice(
              line && line >= 3 ? line - 3 : 0,
              line && line + 3 <= fileContent?.split('\n').length
                ? line + 3
                : undefined,
            )
            .join(''),
          file,
          line,
          symbol,
        }),
        {
          statusCode: HttpStatus.InternalServerError,
        },
      );
    }
  }

  public registerRoute(
    path: RoutePath,
    methods: EnumValuesUnion<HttpMethod>[],
    action: (...args: unknown[]) => unknown | Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    if (options.cors) {
      this.registerRoute(path, [HttpMethod.Options], async () => {
        return null;
      });
    }

    this.routes.push({
      action,
      methods,
      path,
      ...options,
    });
  }

  public any(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, Object.values(HttpMethod), action, options);
  }

  public copy(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Copy], action, options);
  }

  public delete(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Delete], action, options);
  }

  public except(
    methods: EnumValuesUnion<HttpMethod>[],
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(
      path,
      Object.values(HttpMethod).filter(
        (httpMethod) => !methods.includes(httpMethod),
      ),
      action,
      options,
    );
  }

  public get(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Get], action, options);
  }

  public head(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Head], action, options);
  }

  public lock(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Lock], action, options);
  }

  public mkcol(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Mkcol], action, options);
  }

  public move(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Move], action, options);
  }

  public options(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Options], action, options);
  }

  public patch(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Patch], action, options);
  }

  public post(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Post], action, options);
  }

  public propFind(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.PropFind], action, options);
  }

  public propPatch(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.PropPatch], action, options);
  }

  public put(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Put], action, options);
  }

  public search(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Search], action, options);
  }

  public trace(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Trace], action, options);
  }

  public unlock(
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, [HttpMethod.Unlock], action, options);
  }

  public methods(
    methods: EnumValuesUnion<HttpMethod>[],
    path: RoutePath,
    action: (...args: unknown[]) => Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.registerRoute(path, methods, action, options);
  }
}
