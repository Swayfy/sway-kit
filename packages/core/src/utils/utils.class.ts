export abstract class Utils {
  public static escapeEntities(html: string) {
    return html.replace(/[&<>'"]/g, (char) => {
      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[char as keyof typeof entities];
    });
  }

  public static getEnumKey<TValue = string | number>(
    value: TValue,
    enumObject: Record<string, unknown>,
  ): string | undefined {
    return Object.keys(enumObject).find((key) => enumObject[key] === value);
  }

  public static mergeDeep<
    TTarget extends object = Record<string, unknown>,
    TObject = Record<string, unknown>,
  >(target: TTarget, ...elements: TObject[]): TTarget {
    if (!elements.length) {
      return target;
    }

    const source = elements.shift() ?? {};

    for (const key in source) {
      if (
        source[key as keyof typeof source] &&
        typeof source[key as keyof typeof source] === 'object' &&
        !Array.isArray(source[key as keyof typeof source])
      ) {
        if (!target[key as keyof TTarget]) {
          Object.assign(target as object, {
            [key]: {},
          });
        }

        this.mergeDeep(
          target[key as keyof TTarget] as TTarget,
          source[key as keyof typeof source] as TObject,
        );

        continue;
      }

      Object.assign(target, {
        [key]: source[key as keyof typeof source],
      });
    }

    return this.mergeDeep(target, ...elements);
  }

  public static randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  public static randomFloat(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  public static range(start: number, end?: number) {
    if (end === undefined) {
      end = start;
      start = 0;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }
}
