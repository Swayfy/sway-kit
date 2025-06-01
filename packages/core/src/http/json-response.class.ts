import { HttpStatus } from './enums/http-status.enum';

export class JsonResponse {
  constructor(
    public readonly content: object,
    public readonly statusCode?: HttpStatus,
  ) {}
}
