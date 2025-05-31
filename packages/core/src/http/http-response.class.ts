import { HttpStatus } from './enums/http-status.enum.ts';

export class HttpResponse {
  private headersBag: Record<string, string | string[]> = {};

  constructor(
    public readonly content: string | Buffer | Uint8Array | null = null,
    public readonly headers: Headers = new Headers(),
    public readonly statusCode: HttpStatus = HttpStatus.Ok,
  ) {}
}
