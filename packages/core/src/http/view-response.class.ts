import { HttpStatus } from './enums/http-status.enum';

export class ViewResponse {
  constructor(
    public readonly name: string,
    public readonly data: Record<string, unknown> = {},
    public readonly statusCode?: HttpStatus,
  ) {}
}
