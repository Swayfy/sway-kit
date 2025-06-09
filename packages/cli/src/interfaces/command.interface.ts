export interface Command {
  handle: (
    flags: Record<string, unknown>,
    positionals: string[],
  ) => number | Promise<number>;
}
