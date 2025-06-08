import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import util from 'node:util';
import { WebSocketServer } from 'ws';
import { $ } from '../utils/functions/$.function.ts';
import { Channel } from '../web-socket/channel.class.ts';
import { Constructor } from '../utils/interfaces/constructor.interface.ts';
import { debounce } from '../utils/functions/debounce.function.ts';
import { Encrypter } from '../crypto/encrypter.service.ts';
import { ErrorHandler } from '../error/error-handler.service.ts';
import { HotReloadChannel } from './channels/hot-reload.channel.ts';
import { HttpMethod } from '../http/enums/http-method.enum.ts';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { Logger } from '../logger/logger.service.ts';
import { Module } from './interfaces/module.interface.ts';
import { OS, VERSION } from '../constants.ts';
import { Plugin } from './interfaces/plugin.interface.ts';
import { Reflector } from '../utils/reflector.class.ts';
import { Request } from '../http/request.class.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { Router } from '../router/router.service.ts';
import { ServerOptions } from './interfaces/server-options.interface.ts';
import { StateManager } from '../state/state-manager.service.ts';
import { TimeUnit } from '../utils/enums/time-unit.enum.ts';
import { Utils } from '../utils/utils.class.ts';

enum SystemWebClientAlias {
  darwin = 'open',
  linux = 'xdg-open',
  win32 = 'start',
}

@Inject([Encrypter, ErrorHandler, Logger, Router, StateManager])
export class Server {
  private readonly exitSignals: NodeJS.Signals[] = [
    'SIGINT',
    'SIGQUIT',
    'SIGTERM',
  ];

  private options: Partial<ServerOptions> = {};

  private server?: http.Server | http2.Http2SecureServer | https.Server;

  private readonly tempDirectoryPath = path.join('node_modules', '.sway-temp');

  private tlsCert?: string;

  private tlsKey?: string;

  private readonly webSocketChannels: Constructor<Channel>[] = [];

  private webSocketServer?: WebSocketServer;

  constructor(
    private readonly encrypter: Encrypter,
    private readonly errorHandler: ErrorHandler,
    private readonly logger: Logger,
    private readonly router: Router,
    private readonly stateManager: StateManager,
  ) {}

  private addExitSignalListener(callback: () => void | Promise<void>): void {
    for (const signal of this.exitSignals) {
      if (OS === 'win32' && signal !== 'SIGINT') {
        continue;
      }

      process.on(signal, async () => {
        const result = callback();

        if (result instanceof Promise) {
          await result;
        }
      });
    }
  }

  private async createWebSocketServer(): Promise<void> {
    this.stateManager.state.webSocket.port = await this.findAvailablePort(
      this.stateManager.state.webSocket.port,
    );

    if (
      this.stateManager.state.webSocket.port === this.stateManager.state.port
    ) {
      this.webSocketServer = new WebSocketServer({
        noServer: true,
      });

      this.server!.on('upgrade', (request, socket, head) => {
        this.webSocketServer!.handleUpgrade(request, socket, head, (ws) => {
          this.webSocketServer!.emit('connection', ws, request);
        });
      });
    } else {
      if (this.stateManager.state.tls.enabled) {
        const tlsServer = https.createServer({
          cert: this.tlsCert,
          key: this.tlsKey,
        });

        this.webSocketServer = new WebSocketServer({
          port: this.stateManager.state.webSocket.port,
          server: tlsServer,
        });

        tlsServer.listen(this.stateManager.state.webSocket.port);
      } else {
        this.webSocketServer = new WebSocketServer({
          port: this.stateManager.state.webSocket.port,
        });
      }
    }

    this.webSocketServer!.on('connection', (socket: WebSocket) => {
      for (const channel of this.webSocketChannels) {
        const channelInstance = resolve(channel);
        const socketId = this.encrypter.generateUuid();

        const channelProperties = Object.getOwnPropertyNames(
          Object.getPrototypeOf(channelInstance),
        );

        const channelListenerMethods = channelProperties.filter((property) => {
          return (
            !['constructor', 'broadcast'].includes(property) &&
            property[0] !== '_' &&
            typeof Object.getPrototypeOf(channelInstance)[property] ===
              'function' &&
            !!Reflector.getMetadata<string>(
              'subscription',
              Object.getPrototypeOf(channelInstance)[property],
            )
          );
        });

        const authorizationMethod = Object.getPrototypeOf(channelInstance)
          .authorize as (socket: WebSocket) => boolean | Promise<boolean>;

        socket.onopen = () => {
          channelInstance.activeSockets.set(socketId, socket);
        };

        socket.onmessage = async ({ data: payload }) => {
          for (const channelListenerMethod of channelListenerMethods) {
            const isAuthorized = authorizationMethod.call(
              channelInstance,
              socket,
            );

            if (
              isAuthorized instanceof Promise
                ? !(await isAuthorized)
                : !isAuthorized
            ) {
              continue;
            }

            const channelMethod = Object.getPrototypeOf(channelInstance)[
              channelListenerMethod
            ] as (payload: string) => unknown;

            const channelName = Reflector.getMetadata<string>(
              'name',
              Object.getPrototypeOf(channelInstance),
            );

            if (JSON.parse(payload.toString()).channel === channelName) {
              channelMethod.call(
                channelInstance,
                JSON.parse(payload.toString()).payload,
              );
            }
          }
        };

        socket.onclose = () => {
          channelInstance.activeSockets.delete(socketId);
        };
      }
    });

    this.webSocketServer.on('listening', () => {
      if (
        (!this.stateManager.state.hotReload.enabled &&
          this.webSocketChannels.length > 0) ||
        (this.stateManager.state.hotReload.enabled &&
          this.webSocketChannels.length > 1)
      ) {
        this.logger.info(
          `WebSocket server is running on ${
            this.stateManager.state.isProduction
              ? `port ${util.styleText(['bold'], String(this.stateManager.state.webSocket.port))}`
              : `${util.styleText(['bold'], `${this.stateManager.state.tls.enabled ? 'wss' : 'ws'}://${this.stateManager.state.host}:${String(this.stateManager.state.webSocket.port)}`)}`
          }`,
        );
      }
    });
  }

  private async findAvailablePort(port: number): Promise<number> {
    const server = net.createServer();

    return new Promise((resolve) => {
      server
        .once('listening', () => {
          server.close();

          resolve(port);
        })
        .on('error', () => {
          this.logger.warn(
            `Port ${port} is already in use. Trying port ${port + 1}...`,
          );

          port += 1;

          server.listen(port);
        })
        .listen(port);
    });
  }

  private async handleRequest(
    request: http.IncomingMessage | http2.Http2ServerRequest,
    response: http.ServerResponse | http2.Http2ServerResponse,
  ): Promise<void> {
    const performanceTimerStart = performance.now();

    const richRequest = new Request(request);

    await richRequest.$load();

    const { content, headers, statusCode } =
      await this.router.respond(richRequest);

    if (
      !(
        (await richRequest.isStaticFileRequest()) ||
        richRequest.path().startsWith('/@/')
      ) ||
      (this.stateManager.state.logger.staticFileRequests &&
        (await richRequest.isStaticFileRequest()))
    ) {
      let statusColor: 'blue' | 'green' | 'yellowBright' | 'red' = 'blue';

      switch (true) {
        case statusCode >= 100 && statusCode < 200: {
          statusColor = 'blue';

          break;
        }

        case statusCode >= 200 && statusCode < 400: {
          statusColor = 'green';

          break;
        }

        case statusCode >= 400 && statusCode < 500: {
          statusColor = 'yellowBright';

          break;
        }

        case statusCode >= 500 && statusCode < 600: {
          statusColor = 'red';

          break;
        }
      }

      const performanceElapsedTime = performance.now() - performanceTimerStart;

      const responsePerformance =
        performanceElapsedTime >= TimeUnit.Second
          ? `${(performanceElapsedTime / TimeUnit.Second).toFixed(1)}s`
          : `${performanceElapsedTime.toFixed(1)}ms`;

      const logLeft = `${util.styleText(statusColor, `[${statusCode}]`)} ${util.styleText(
        ['white', 'bold'],
        richRequest.method() ?? HttpMethod.Get,
      )} ${util.styleText(['white', 'bold'], richRequest.path())}`;

      const logRight = `${util.styleText(['white', 'dim'], `~ ${responsePerformance}`)}`;

      this.logger.info(
        `${logLeft} ${util.styleText(
          ['white', 'dim'],
          '.'.repeat(
            process.stdout.columns -
              util.stripVTControlCharacters(logLeft).length -
              util.stripVTControlCharacters(logRight).length -
              4,
          ),
        )} ${logRight}`,
      );
    }

    headers.forEach((value, key) => {
      if (Array.isArray(value)) {
        for (const item of value) {
          response.setHeader(key, item);
        }
      } else {
        response.setHeader(key, value);
      }
    });

    response.statusCode = statusCode;

    content === null && this.stateManager.state.http2
      ? response.end()
      : (response as http.ServerResponse).end(content);
  }

  private registerModule(module: Constructor<Module>): void {
    const instance = resolve(module);

    for (const controller of instance.controllers ?? []) {
      this.router.registerController(controller);
    }

    this.webSocketChannels.push(...(instance.channels ?? []));

    for (const route of instance.routes ?? []) {
      this.router.registerRoute(
        route.path,
        route.methods,
        route.action,
        Utils.omit(route, ['path', 'methods', 'action']),
      );
    }

    for (const importedModule of instance.imports ?? []) {
      this.registerModule(importedModule);
    }
  }

  private async registerPlugin(plugin: Plugin): Promise<void> {
    const initCallbackResult = plugin.onLoad?.();

    if (initCallbackResult instanceof Promise) {
      await initCallbackResult;
    }

    for (const module of plugin.modules ?? []) {
      this.registerModule(module);
    }

    for (const controller of plugin.controllers ?? []) {
      this.router.registerController(controller);
    }

    this.webSocketChannels.push(...(plugin.channels ?? []));

    for (const route of plugin.routes ?? []) {
      this.router.registerRoute(
        route.path,
        route.methods,
        route.action,
        Utils.omit(route, ['path', 'methods', 'action']),
      );
    }
  }

  public setup(options: Partial<ServerOptions>): this {
    this.options = options;

    return this;
  }

  private async setupCommonEnvironment(): Promise<void> {
    this.stateManager.setup(this.options.config ?? {});

    if (!fs.existsSync(this.tempDirectoryPath)) {
      await fsp.mkdir(this.tempDirectoryPath, {
        recursive: true,
      });
    }

    this.stateManager.state.port = await this.findAvailablePort(
      this.stateManager.state.port,
    );
  }

  private async setupDevelopmentEnvironment(): Promise<void> {
    if (
      VERSION.includes('alpha') ||
      VERSION.includes('beta') ||
      VERSION.includes('rc')
    ) {
      this.logger.warn('Using a pre-release version of SwayKit Core');
    }

    if (
      process.argv[2] === '--open' &&
      !fs.existsSync(path.join(this.tempDirectoryPath, 'server.log'))
    ) {
      try {
        await $(
          `${
            SystemWebClientAlias[OS as keyof typeof SystemWebClientAlias] ??
            'open'
          } ${this.router.baseUrl()}`,
        );
      } finally {
        await fsp.writeFile(
          path.join(this.tempDirectoryPath, 'server.log'),
          `${Date.now()}\n`,
          'utf8',
        );
      }
    }

    this.router.registerRoute(
      '/@/error.png',
      [HttpMethod.Get],
      async () => {
        return await fsp.readFile(
          path.join('node_modules', '@sway-kit', 'core', 'assets', 'error.png'),
        );
      },
      {
        headers: {
          'content-type': 'image/png',
        },
      },
    );

    if (this.stateManager.state.hotReload.enabled) {
      this.webSocketChannels.push(HotReloadChannel);

      const hotReloadChannel = resolve(HotReloadChannel);

      fs.watch('views', { recursive: true }, () => {
        hotReloadChannel.sendReloadRequest();
      });

      fs.watch('src', { recursive: true }, async (_event, filename) => {
        if (filename?.endsWith('.html')) {
          await fsp.copyFile(`src/${filename}`, `build/${filename}`);

          hotReloadChannel.sendReloadRequest();
        }
      });

      if (this.stateManager.state.hotReload.watchSourceChanges) {
        fs.watch('build', { recursive: true }, () => {
          debounce(() => hotReloadChannel.sendReloadRequest(), 20);
        });
      }
    }
  }

  private setupProductionEnvironment(): void {
    this.addExitSignalListener(() => {
      const shouldQuit = confirm(
        'Are you sure you want to quit production server?',
      );

      if (shouldQuit) {
        process.exit();
      }
    });
  }

  public async start(): Promise<void> {
    try {
      await this.setupCommonEnvironment();

      this.stateManager.state.isProduction
        ? this.setupProductionEnvironment()
        : await this.setupDevelopmentEnvironment();

      for (const module of this.options.modules ?? []) {
        this.registerModule(module);
      }

      for (const controller of this.options.controllers ?? []) {
        this.router.registerController(controller);
      }

      this.webSocketChannels.push(...(this.options.channels ?? []));

      for (const route of this.options.routes ?? []) {
        this.router.registerRoute(
          route.path,
          route.methods,
          route.action,
          Utils.omit(route, ['path', 'methods', 'action']),
        );
      }

      for (const plugin of this.options.plugins ?? []) {
        await this.registerPlugin(plugin);
      }

      if (
        this.stateManager.state.http2 ||
        this.stateManager.state.tls.enabled
      ) {
        try {
          this.tlsCert = await fsp.readFile(
            this.stateManager.state.tls.certFile,
            'utf8',
          );

          this.tlsKey = await fsp.readFile(
            this.stateManager.state.tls.keyFile,
            'utf8',
          );
        } catch (error) {
          this.stateManager.state.tls.enabled = false;

          throw new Error('Failed to load TLS key or certificate');
        }
      }

      if (this.stateManager.state.http2) {
        this.server = http2.createSecureServer(
          {
            allowHTTP1: true,
            cert: this.tlsCert,
            key: this.tlsKey,
          },
          this.handleRequest.bind(this),
        );
      } else if (this.stateManager.state.tls.enabled) {
        this.server = https.createServer(
          {
            cert: this.tlsCert,
            key: this.tlsKey,
          },
          this.handleRequest.bind(this),
        );
      } else {
        this.server = http.createServer(this.handleRequest.bind(this));
      }

      this.server.listen(
        this.stateManager.state.port,
        this.stateManager.state.host,
      );

      this.logger.info(
        `HTTP${this.stateManager.state.tls.enabled && !this.stateManager.state.http2 ? 'S' : ''}${this.stateManager.state.http2 ? '/2' : ''} server is running on ${
          this.stateManager.state.isProduction
            ? `port ${util.styleText(['bold'], String(this.stateManager.state.port))}`
            : `${util.styleText(['bold'], this.router.baseUrl())}`
        }${this.stateManager.state.isProduction ? '' : util.styleText(['white', 'dim'], ` [${process.platform === 'darwin' ? '⌃C' : 'Ctrl+C'} to quit]`)}`,
      );

      if (this.stateManager.state.webSocket?.enabled) {
        await this.createWebSocketServer();
      }
    } catch (error) {
      this.errorHandler.handle(error as Error);
    }
  }
}
