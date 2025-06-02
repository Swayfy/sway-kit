import { ClassDecorator } from '../../utils/types/class-decorator.type.ts';
import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Middleware } from '../interfaces/middleware.interface.ts';
import { Reflector } from '../../utils/reflector.class.ts';

export function Use(middleware: Constructor<Middleware>[]): ClassDecorator {
  return (originalClass) => {
    Reflector.defineMetadata<Constructor<Middleware>[]>(
      'middleware',
      middleware,
      originalClass,
    );
  };
}
