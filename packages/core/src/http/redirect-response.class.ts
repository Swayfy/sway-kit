import { HttpStatus } from './enums/http-status.enum';
import { RoutePath } from '../router/types/route-path.type';
import { Url } from '../router/types/url.type';

export class RedirectResponse {
  constructor(
    public readonly destination: RoutePath | Url,
    public readonly statusCode?: HttpStatus,
    public readonly cookies?: Record<string, string>,
  ) {}
}
