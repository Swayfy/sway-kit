export type MethodDecorator = (
  originalMethod: object | ((...args: unknown[]) => unknown),
  context: ClassMethodDecoratorContext,
) => any;
