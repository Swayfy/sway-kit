import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { join as joinPath } from 'node:path';
import { File } from 'formidable';

export class RequestFile {
  constructor(private readonly rawInstance: File) {}

  public generatedName(): string {
    return this.rawInstance.newFilename;
  }

  public originalName(): string | null {
    return this.rawInstance.originalFilename;
  }

  public async store(path: string, name?: string) {
    const directory = joinPath(...path.split('/'));

    if (!fs.existsSync(directory)) {
      await fsp.mkdir(directory, {
        recursive: true,
      });
    }

    const { newFilename, filepath } = this.rawInstance;

    const fileName = name
      ? `${name}.${newFilename.split('.').pop()}`
      : newFilename;

    path = joinPath(directory, fileName);

    await fsp.rename(filepath, path);

    this.rawInstance.filepath = path;
  }
}
