export interface Command {
  handle: (
    args: Record<string, unknown>,
    positionals: string[],
  ) => number | Promise<number>;
}
