import util from 'node:util';
import { Inject } from '../injector/decorators/inject.decorator.ts';
import { Logger } from '../logger/logger.service.ts';

interface ErrorInfo {
  file?: string;
  line?: number;
  symbol?: string;
}

@Inject([Logger])
export class ErrorHandler {
  private readonly defaultFilePlaceholder = '@sway-kit/core';

  constructor(private readonly logger: Logger) {}

  private readErrorStack(error: Error): ErrorInfo {
    if (!error?.stack) {
      return {
        file: this.defaultFilePlaceholder,
        line: undefined,
        symbol: undefined,
      };
    }

    const stackLines = error.stack.split('\n');
    const thrownAtLine = stackLines[1] || '';

    const file = thrownAtLine.includes('@sway-kit')
      ? this.defaultFilePlaceholder
      : thrownAtLine
          .slice(thrownAtLine.indexOf('src'), thrownAtLine.indexOf(':'))
          .replaceAll(/\\/g, '/');

    const line = thrownAtLine.includes(':')
      ? parseInt(
          thrownAtLine.slice(
            thrownAtLine.indexOf(':') + 1,
            thrownAtLine.lastIndexOf(':'),
          ),
        )
      : undefined;

    const symbol =
      file === this.defaultFilePlaceholder
        ? undefined
        : thrownAtLine.slice(
            thrownAtLine.indexOf('at ') + 3,
            thrownAtLine.indexOf(' ('),
          );

    return {
      file,
      line,
      symbol,
    };
  }

  public handle(error: Error): ErrorInfo {
    const { file, line, symbol } = this.readErrorStack(error);

    const formattedLine = util.styleText(
      ['white', 'dim'],
      `[${file ?? this.defaultFilePlaceholder}${line && file !== this.defaultFilePlaceholder ? `:${line}` : ''}]`,
    );

    this.logger.error(`${error.message} ${line ? formattedLine : ''}`);

    return {
      file,
      line,
      symbol,
    };
  }
}
