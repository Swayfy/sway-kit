import bcrypt from 'bcrypt';

interface UuidOptions {
  clean?: boolean;
}

export class Encrypter {
  public async compareHash(plainText: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(plainText, hash);
  }

  public generateRandomString(length = 32): string {
    if (length % 2 !== 0) {
      throw new Error('Provided random string length is not even');
    }

    const buffer = new Uint8Array(length / 2);

    crypto.getRandomValues(buffer);

    let result = '';

    for (const char of buffer) {
      result += `0${char.toString(16)}`.slice(-2);
    }

    return result;
  }

  public generateUuid({ clean = false }: UuidOptions = {}): string {
    const uuid = crypto.randomUUID();

    return clean ? uuid.replaceAll('-', '') : uuid;
  }

  public async hash(plainText: string, rounds = 12): Promise<string> {
    return await bcrypt.hash(plainText, rounds);
  }
}
