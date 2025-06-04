import { HttpStatus } from './enums/http-status.enum.ts';
import { Utils } from '../utils/utils.class.ts';

export class HttpError extends Error {
  public override readonly name = 'HttpError';

  constructor(
    public readonly statusCode = HttpStatus.NotFound,
    customMessage?: string,
    options: ErrorOptions = {},
  ) {
    let message =
      customMessage ??
      Utils.getEnumKey(statusCode, HttpStatus)?.replace(
        /([a-z])([A-Z])/g,
        '$1 $2',
      ) ??
      'HTTP Error';

    if (!customMessage) {
      switch (statusCode) {
        case HttpStatus.NonAuthoritativeInformation: {
          message = 'Non-Authoritative Information';

          break;
        }

        case HttpStatus.MultiStatus: {
          message = 'Multi-Status';

          break;
        }

        case HttpStatus.ImUsed: {
          message = 'IM Used';

          break;
        }

        case HttpStatus.UriTooLong: {
          message = 'URI Too Long';

          break;
        }

        case HttpStatus.ImATeapot: {
          message = `I'm a Teapot`;

          break;
        }

        case HttpStatus.HttpVersionNotSupported: {
          message = 'HTTP Version Not Supported';

          break;
        }
      }
    }

    super(message, options);

    this.message = message;
  }
}
