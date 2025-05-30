import { resolve } from '../../injector/functions/resolve.function.ts';
import { Server } from '../server.service.ts';
import { ServerOptions } from '../interfaces/server-options.interface.ts';

export function createServer(options: ServerOptions = {}): Server {
  const server = resolve(Server);

  return server.setup(options);
}
