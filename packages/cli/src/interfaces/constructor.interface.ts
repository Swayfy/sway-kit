export interface Constructor<TTarget = unknown> {
  new (...args: any[]): TTarget;
}
