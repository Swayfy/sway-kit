import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpStatus } from './enums/http-status.enum';

export class ViewResponse {
  private readonly file: string;

  constructor(
    public readonly view: string,
    public readonly data: Record<string, unknown> = {},
    public readonly statusCode?: HttpStatus,
  ) {
    this.file = path.join(
      'views',
      `${this.view.replaceAll(/[/\\]/g, path.sep)}.html`,
    );
  }

  private async assertFileExists(): Promise<void> {
    try {
      await fs.stat(this.file);
    } catch (error) {
      throw new Error(
        `View '${this.file.split('.html')[0].split('/').pop()}' does not exist`,
      );
    }
  }

  public async content(): Promise<string> {
    await this.assertFileExists();

    const content = await fs.readFile(this.file, 'utf-8');

    const rendered = content.replaceAll(
      /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
      (_, key) => {
        if (key in this.data) {
          return String(this.data[key]);
        }

        throw new Error(`Missing variable "${key}" in view ${this.view}`);
      },
    );

    return rendered;
  }
}
