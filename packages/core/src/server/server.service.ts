import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import chalk, { ChalkInstance } from 'chalk';
import { $ } from '../utils/functions/$.function.ts';
import { Constructor } from '../utils/interfaces/constructor.interface.ts';
import { HttpMethod } from '../http/enums/http-method.enum.ts';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { Logger } from '../logger/logger.service.ts';
import { Module } from './interfaces/module.interface.ts';
import { Plugin } from './interfaces/plugin.interface.ts';
import { Request } from '../http/request.class.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { Router } from '../router/router.service.ts';
import { ServerOptions } from './interfaces/server-options.interface.ts';
import { StateManager } from '../state/state-manager.service.ts';
import { OS, VERSION } from '../constants.ts';
import { TimeUnit } from '../utils/enums/time-unit.enum.ts';
import { Utils } from '../utils/utils.class.ts';

enum WebClientAlias {
  darwin = 'open',
  linux = 'xdg-open',
  win32 = 'start',
}

@Inject([Logger, Router, StateManager])
export class Server implements Disposable {
  private readonly exitSignals: NodeJS.Signals[] = [
    'SIGINT',
    'SIGQUIT',
    'SIGTERM',
  ];

  private options: Partial<ServerOptions> = {};

  private server?: http.Server;

  constructor(
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
            `Port ${port} is already in use. Trying port ${++port}...`,
          );

          server.listen(port);
        })
        .listen(port);
    });
  }

  private async handleRequest(
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): Promise<void> {
    const performanceTimerStart = performance.now();

    const richRequest = new Request(request);

    await richRequest.onReady();

    const { content, headers, statusCode } =
      await this.router.respond(richRequest);

    if (
      !(await richRequest.isStaticFileRequest()) ||
      (this.stateManager.state.logger.staticFileRequests &&
        (await richRequest.isStaticFileRequest()))
    ) {
      let statusColor: ChalkInstance = chalk.blue;

      switch (true) {
        case statusCode >= 100 && statusCode < 200: {
          statusColor = chalk.blue;

          break;
        }

        case statusCode >= 200 && statusCode < 400: {
          statusColor = chalk.green;

          break;
        }

        case statusCode >= 400 && statusCode < 500: {
          statusColor = chalk.hex('#ed9b58');

          break;
        }

        case statusCode >= 500 && statusCode < 600: {
          statusColor = chalk.red;

          break;
        }
      }

      const performanceElapsedTime = performance.now() - performanceTimerStart;

      const responsePerformance =
        performanceElapsedTime >= TimeUnit.Second
          ? `~ ${(performanceElapsedTime / TimeUnit.Second).toFixed(1)}s`
          : `~ ${performanceElapsedTime.toFixed(1)}ms`;

      this.logger.info(
        `${statusColor(`[${statusCode}]`)} ${chalk.white.bold(richRequest.method() ?? HttpMethod.Get)} ${chalk.white.bold(richRequest.path())} ${chalk.gray('.'.repeat(90))} ${chalk.gray(responsePerformance)}`,
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

    response.end(content);
  }

  private registerModule(module: Constructor<Module>): void {
    const instance = resolve(module);

    for (const controller of instance.controllers ?? []) {
      this.router.registerController(controller);
    }

    for (const route of instance.routes ?? []) {
      this.router.registerRoute(
        route.path,
        route.methods,
        route.action,
        Utils.omit(route, ['path', 'methods', 'action']),
      );
    }

    for (const submodule of instance.submodules ?? []) {
      this.registerModule(submodule);
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
      !fs.existsSync(path.join('node_modules', '.sway-temp'))
    ) {
      try {
        await $(
          `${
            WebClientAlias[OS as keyof typeof WebClientAlias] ?? 'open'
          } ${this.router.baseUrl()}`,
        );
      } finally {
        await fsp.mkdir(path.join('node_modules', '.sway-temp'), {
          recursive: true,
        });

        await fsp.writeFile(
          path.join('node_modules', '.sway-temp', 'server'),
          'Development server is up\n',
          'utf8',
        );
      }
    }

    this.addExitSignalListener(async () => {
      try {
        await fsp.rm(path.join('node_modules', '.sway-temp'), {
          recursive: true,
          force: true,
        });
      } finally {
        process.exit();
      }
    });
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
    this.stateManager.setup(this.options.config ?? {});

    this.stateManager.state.isProduction
      ? this.setupProductionEnvironment()
      : await this.setupDevelopmentEnvironment();

    for (const module of this.options.modules ?? []) {
      this.registerModule(module);
    }

    for (const controller of this.options.controllers ?? []) {
      this.router.registerController(controller);
    }

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

    const port = await this.findAvailablePort(this.stateManager.state.port);

    this.server = http.createServer(async (request, response) => {
      await this.handleRequest(request, response);
    });

    this.addExitSignalListener(async () => {
      process.exit();
    });

    this.server.listen(port, this.stateManager.state.host, () => {
      this.logger.info(
        `HTTP server is running on ${
          this.stateManager.state.isProduction
            ? `port ${chalk.bold(port)}`
            : `${chalk.bold(this.router.baseUrl())}`
        }${this.stateManager.state.isProduction ? '' : chalk.gray(` [${process.platform === 'darwin' ? '⌃C' : 'Ctrl+C'} to quit]`)}`,
      );
    });
  }

  public [Symbol.dispose](): void {
    this.logger.warn('Server has terminated');
  }
}
