import { HttpStatus } from './enums/http-status.enum';
import { RoutePath } from '../router/types/route-path.type';
import { Url } from '../router/types/url.type';

export class RedirectBackResponse {
  constructor(
    public readonly fallback?: RoutePath | Url,
    public readonly statusCode?: HttpStatus,
    public readonly cookies?: Record<string, string>,
  ) {}
}
