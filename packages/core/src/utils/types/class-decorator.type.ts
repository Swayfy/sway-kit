import { Constructor } from '../interfaces/constructor.interface.ts';

export type ClassDecorator<TTarget extends Constructor = any> = (
  originalClass: Constructor<TTarget>,
  context: ClassDecoratorContext,
) => TTarget;
