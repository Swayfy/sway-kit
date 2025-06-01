import { HttpStatus } from './enums/http-status.enum';

export class DownloadResponse {
  constructor(
    public readonly content: string | Buffer,
    public readonly filename: string,
    public readonly statusCode?: HttpStatus,
  ) {}
}
