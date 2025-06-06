export function debounce<TFunction extends (...args: unknown[]) => void>(
  callback: TFunction,
  delay: number,
): (...args: Parameters<TFunction>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<TFunction>) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
