import { HttpStatus } from './enums/http-status.enum';

export class DownloadResponse {
  constructor(
    public readonly content: string | Buffer | Uint8Array,
    public readonly filename: string,
    public readonly statusCode?: HttpStatus,
    public readonly cookies?: Record<string, string>,
  ) {}
}
