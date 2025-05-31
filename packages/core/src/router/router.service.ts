import fs from 'node:fs/promises';
import { join as joinPath } from 'node:path';
import { Constructor } from '../utils/interfaces/constructor.interface.ts';
import { CONTENT_TYPES } from './constants.ts';
import { Controller } from './controller.class.ts';
import { HttpError } from '../http/http-error.class.ts';
import { HttpMethod } from '../http/enums/http-method.enum.ts';
import { HttpRequest } from '../http/http-request.class.ts';
import { HttpResponse } from '../http/http-response.class.ts';
import { HttpStatus } from '../http/enums/http-status.enum.ts';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { Logger } from '../logger/logger.service.ts';
import { EnumValuesUnion } from '../utils/types/enum-values-union.type.ts';
import { MethodDecorator } from '../utils/types/method-decorator.type.ts';
import { Reflector } from '../utils/reflector.class.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { Route } from './interfaces/route.interface.ts';
import { RouteOptions } from './interfaces/route-options.interface.ts';
import { RoutePath } from './types/route-path.type.ts';
import { StateManager } from '../state/state-manager.service.ts';
import { Url } from './types/url.type.ts';
import { TimeUnit } from '../utils/enums/time-unit.enum.ts';

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

@Inject([Logger, StateManager])
export class Router {
  private readonly httpErrorHandlers = new Map<
    HttpStatus | undefined,
    (statusCode: HttpStatus) => unknown
  >();

  constructor(
    private readonly logger: Logger,
    private readonly stateManager: StateManager,
  ) {}

  private readonly routes: Route[] = [];

  private async createResponse(
    request: HttpRequest,
    body: unknown,
    {
      cookies = {},
      headers = {},
      statusCode = HttpStatus.Ok,
    }: ResponseOptions = {},
  ): Promise<HttpResponse> {
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

    const { cors } = this.stateManager.state;

    const securityHeaders = {
      'access-control-allow-credentials': String(cors.allowCredentials),
      'access-control-allow-headers': cors.allowedHeaders.length
        ? cors.allowedHeaders.join(',')
        : (request.header('access-control-request-headers') ?? ''),
      ...(cors.allowedMethods.length && {
        'access-control-allow-methods': cors.allowedMethods.join(','),
      }),
      ...(((cors.allowedOrigins.length &&
        cors.allowedOrigins.includes(request.header('origin') ?? '')) ||
        cors.allowedOrigins[0] === '*') && {
        'access-control-allow-origin':
          cors.allowedOrigins[0] === '*' ? '*' : request.header('origin'),
      }),
      ...(cors.exposedHeaders.length && {
        'access-control-expose-headers': cors.exposedHeaders.join(','),
      }),
      'access-control-max-age': String(cors.maxAge),
      'content-security-policy': Object.entries(csp)
        .map(([key, value]) => `${key} ${value}`)
        .join(';'),
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'origin-agent-cluster': '?1',
      'permissions-policy':
        'autoplay=(self), camera=(), encrypted-media=(self), geolocation=(self), microphone=(), payment=(), sync-xhr=(self)',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      ...(!cors.allowedMethods.includes('*') && {
        vary: 'origin',
      }),
      'x-content-type-options': 'nosniff',
      'x-dns-prefetch-control': 'off',
      ...(this.stateManager.state.poweredByHeader && {
        'x-powered-by': 'SwayKit Core',
      }),
      'x-xss-protection': '0',
    };

    const { body: parsedBody, contentType } = await this.parseResponseBody(
      request,
      body,
    );

    const baseHeaders = {
      'content-type': `${contentType}; charset=utf-8`,
      'cache-control':
        this.stateManager.state.cache.enabled &&
        (await request.isStaticFileRequest())
          ? `max-age=${
              (this.stateManager.state.cache.maxAge * 24 * TimeUnit.Hour) / 1000
            }`
          : 'no-cache',
    };

    const response = new HttpResponse(
      parsedBody,
      new Headers({
        ...baseHeaders,
        ...securityHeaders,
        ...headers,
      }),
      parsedBody === null ? HttpStatus.NoContent : statusCode,
    );

    for (const [cookie, cookieValue] of Object.entries(cookies)) {
      response.headers.append(
        'set-cookie',
        `${cookie}=${cookieValue}; SameSite=Lax; Max-Age=${
          (this.stateManager.state.cookies.maxAge * 24 * TimeUnit.Hour) / 1000
        }`,
      );
    }

    return response;
  }

  private async createStaticFileResponse(
    request: HttpRequest,
  ): Promise<HttpResponse> {
    const filePath = joinPath(
      this.stateManager.state.staticFilesDirectory,
      ...request.path().split('/'),
    );

    try {
      const fileSize = (await fs.stat(filePath)).size;
      const body = await fs.readFile(filePath);

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
    request: HttpRequest,
    body: unknown,
  ): Promise<{ body: string | null | ReadableStream; contentType: string }> {
    let contentType = 'text/html';

    if (body instanceof Promise) {
      body = await body;
    }

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

      // case body instanceof View: {
      //   const template = await (body as View).getTemplate();
      //   const compiledTemplate = await inject(TemplateCompiler).render(
      //     template,
      //     (body as View).variables,
      //     {
      //       file: (body as View).file,
      //       request,
      //       ...(body as View).options,
      //     },
      //   );

      //   body = compiledTemplate;

      //   break;
      // }

      // case body instanceof Json: {
      //   body = JSON.stringify((body as Json).json);
      //   contentType = 'application/json';

      //   break;
      // }

      case Array.isArray(body) ||
        (typeof body === 'object' &&
          body !== null &&
          (body as Record<string, unknown>).constructor === Object): {
        body = JSON.stringify(body);
        contentType = 'application/json';

        break;
      }

      case body instanceof ReadableStream || body instanceof Uint8Array: {
        contentType = 'application/octet-stream';

        break;
      }

      default: {
        throw new Error('Invalid response type');
      }
    }

    return {
      body: body as string | null | ReadableStream,
      contentType,
    };
  }

  private resolveRoutePath(basePath: RoutePath, path: RoutePath): RoutePath {
    return basePath === '/'
      ? path
      : (`${basePath}${
          path[0] !== '/' && basePath.split('').pop() !== '/' ? '/' : ''
        }${path}` as RoutePath);
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
          'route',
          {
            ...options,
            methods,
            path,
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

      const handler = Reflector.getMetadata<{ statusCode?: HttpStatus }>(
        'httpErrorHandler',
        controllerMethodRef,
      );

      if (handler) {
        this.httpErrorHandlers.set(
          handler.statusCode,
          async (statusCode: HttpStatus) => {
            const methodResult = controllerMethodRef.call(
              controllerInstance,
              statusCode,
            );

            return methodResult instanceof Promise
              ? await methodResult
              : methodResult;
          },
        );

        continue;
      }

      const { methods, path } = Reflector.getMetadata<Exclude<Route, 'action'>>(
        'route',
        controllerMethodRef,
      )!;

      const basePath =
        Reflector.getMetadata<RoutePath>(
          'basePath',
          Object.getPrototypeOf(controllerInstance),
        ) ?? '/';

      const resolvedPath = this.resolveRoutePath(basePath, path);

      this.registerRoute(resolvedPath, methods, async (...args: unknown[]) => {
        const methodResult = controllerMethodRef.call(
          controllerInstance,
          ...args,
        );

        return methodResult instanceof Promise
          ? await methodResult
          : methodResult;
      });
    }
  }

  public async respond(request: HttpRequest): Promise<HttpResponse> {
    try {
      const requestMethod = request.method();

      for (const route of this.routes) {
        if (!route.methods.includes(requestMethod)) {
          continue;
        }

        // @ts-ignore URLPattern is temporarily not declared globally by @types/node
        const urlPattern = new URLPattern({
          pathname: route.path,
        });

        for (const method of route.methods) {
          if (requestMethod === method && urlPattern.test(request.url())) {
            const paramGroups =
              urlPattern.exec(request.url())?.pathname.groups ?? {};

            for (const [paramName, paramValue] of Object.entries(paramGroups)) {
              if (paramValue === '') {
                paramGroups[paramName] = undefined;
              }
            }

            const resolvedParams = Object.values(paramGroups);

            return await this.createResponse(
              request,
              await route.action(resolvedParams, request),
              {
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
      if (error instanceof HttpError) {
        const handler = this.httpErrorHandlers.get(error.statusCode);

        if (handler) {
          return await this.createResponse(request, error, {
            statusCode: error.statusCode,
          });
        }

        return await this.createResponse(request, error, {
          statusCode: error.statusCode,
        });
      }

      this.logger.error(`Error: ${(error as Error).message}`);

      return await this.createResponse(request, error, {
        statusCode: HttpStatus.InternalServerError,
      });
    }
  }

  public registerRoute(
    path: RoutePath,
    methods: EnumValuesUnion<HttpMethod>[],
    action: (...args: unknown[]) => unknown | Promise<unknown>,
    options: RouteOptions = {},
  ): void {
    this.routes.push({
      ...options,
      action,
      methods,
      path,
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
