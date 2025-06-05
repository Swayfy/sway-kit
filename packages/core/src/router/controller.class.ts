import { DownloadResponse } from '../http/download-response.class.ts';
import { HtmlResponse } from '../http/html-response.class.ts';
import { HttpStatus } from '../http/enums/http-status.enum.ts';
import { JsonResponse } from '../http/json-response.class.ts';
import { ViewResponse } from '../http/view-response.class.ts';

export abstract class Controller {
  public download(
    content: string | Buffer | Uint8Array,
    filename: string,
    statusCode?: HttpStatus,
  ): DownloadResponse {
    return new DownloadResponse(content, filename, statusCode);
  }

  public html(content: string, statusCode?: HttpStatus): HtmlResponse {
    return new HtmlResponse(content, statusCode);
  }

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
