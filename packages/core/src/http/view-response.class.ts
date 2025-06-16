import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpStatus } from './enums/http-status.enum';

export class ViewResponse {
  private readonly file: string;

  constructor(
    public readonly view: string,
    public readonly data: Record<string, unknown> = {},
    public readonly statusCode?: HttpStatus,
    public readonly cookies?: Record<string, string>,
  ) {
    this.file = view.startsWith('@')
      ? path.join(`${this.view.slice(1).replaceAll(/[/\\]/g, path.sep)}.html`)
      : path.join('views', `${this.view.replaceAll(/[/\\]/g, path.sep)}.html`);
  }

  public async assertFileExists(): Promise<void> {
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

    return await fs.readFile(this.file, 'utf-8');
  }
}
