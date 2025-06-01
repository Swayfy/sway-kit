import { join as joinPath } from 'node:path';
import { readFile } from 'node:fs/promises';
import { HttpStatus } from '../http/enums/http-status.enum.ts';
import { JsonResponse } from '../http/json-response.class.ts';

export abstract class Controller {
  public json(
    content: object,
    statusCode: HttpStatus = HttpStatus.Ok,
  ): JsonResponse {
    return new JsonResponse(content, statusCode);
  }

  public async render(
    view: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const rendered = await readFile(joinPath('views', `${view}.html`), 'utf-8');

    return rendered.replaceAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
      if (key in data) {
        return String(data[key]);
      }

      throw new Error(`Missing variable "${key}" in view ${view}`);
    });
  }
}
