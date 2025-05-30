import { HttpStatus } from './enums/http-status.enum.ts';

export class HttpResponse {
  constructor(
    public readonly content: string | Buffer,
    public readonly headers: Record<string, string | string[]> = {},
    public readonly statusCode: HttpStatus,
  ) {}
}
