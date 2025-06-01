import { HttpStatus } from '../http/enums/http-status.enum.ts';
import { JsonResponse } from '../http/json-response.class.ts';
import { ViewResponse } from '../http/view-response.class.ts';

export abstract class Controller {
  public json(content: object, statusCode?: HttpStatus): JsonResponse {
    return new JsonResponse(content, statusCode);
  }

  public async render(
    view: string,
    data: Record<string, unknown>,
    statusCode?: HttpStatus,
  ): Promise<ViewResponse> {
    return new ViewResponse(view, data, statusCode);
  }
}
