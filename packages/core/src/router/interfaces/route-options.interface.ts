import { HttpStatus } from '../../http/enums/http-status.enum.ts';

export interface RouteOptions {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  statusCode?: HttpStatus;
}
