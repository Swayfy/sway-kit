import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { HttpStatus } from '../../http/enums/http-status.enum.ts';
import { Middleware } from './middleware.interface.ts';

export interface RouteOptions {
  cookies?: Record<string, string>;
  cors?: boolean;
  headers?: Record<string, string>;
  httpErrorHandler?: boolean;
  middleware?: Constructor<Middleware>[];
  statusCode?: HttpStatus;
  view?: string;
}
