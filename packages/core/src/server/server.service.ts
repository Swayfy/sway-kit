import http from 'node:http';
import net from 'node:net';
import chalk from 'chalk';
import { Constructor } from '../utils/interfaces/constructor.interface.ts';
import { HttpRequest } from '../http/http-request.class.ts';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { Logger } from '../logger/logger.service.ts';
import { Module } from './interfaces/module.interface.ts';
import { Plugin } from './interfaces/plugin.interface.ts';
import { resolve } from '../injector/functions/resolve.function.ts';
import { Router } from '../router/router.service.ts';
import { ServerOptions } from './interfaces/server-options.interface.ts';
import { StateManager } from '../state/state-manager.service.ts';

@Inject([Logger, Router, StateManager])
export class Server implements Disposable {
  private options: Partial<ServerOptions> = {};

  private server?: http.Server;

  constructor(
    private readonly logger: Logger,
    private readonly router: Router,
    private readonly stateManager: StateManager,
  ) {}

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
    const { content, headers, statusCode } = await this.router.respond(
      new HttpRequest(request),
    );

    response.writeHead(statusCode, headers);

    response.end(content);
  }

  private registerModule(module: Constructor<Module>): void {
    const instance = resolve(module);

    for (const controller of instance.controllers ?? []) {
      this.router.registerController(controller);
    }

    for (const route of instance.routes ?? []) {
      this.router.registerRoute(...route);
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
      this.router.registerRoute(...route);
    }
  }

  public setup(options: Partial<ServerOptions>): this {
    this.options = options;

    return this;
  }

  public async start(): Promise<void> {
    this.stateManager.setup(this.options.config ?? {});

    for (const module of this.options.modules ?? []) {
      this.registerModule(module);
    }

    for (const controller of this.options.controllers ?? []) {
      this.router.registerController(controller);
    }

    for (const route of this.options.routes ?? []) {
      this.router.registerRoute(...route);
    }

    for (const plugin of this.options.plugins ?? []) {
      await this.registerPlugin(plugin);
    }

    const port = await this.findAvailablePort(this.stateManager.state.port);

    this.server = http.createServer(async (request, response) => {
      await this.handleRequest(request, response);
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

    process.exit(1);
  }
}
