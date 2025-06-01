import { HttpStatus } from './enums/http-status.enum.ts';

export class Response {
  constructor(
    public readonly content: string | null | Buffer | Uint8Array = null,
    public readonly headers: Headers = new Headers(),
    public readonly statusCode: HttpStatus = HttpStatus.Ok,
  ) {}

  public setHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }
}
