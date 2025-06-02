import { HttpStatus } from './enums/http-status.enum';

export class HtmlResponse {
  constructor(
    public readonly content: unknown,
    public readonly statusCode?: HttpStatus,
  ) {}
}
