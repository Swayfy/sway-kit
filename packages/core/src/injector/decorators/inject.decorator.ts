import { ClassDecorator } from '../../utils/types/class-decorator.type.ts';
import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Reflector } from '../../utils/reflector.class.ts';

export function Inject(dependencies: Constructor[]): ClassDecorator {
  return (originalClass) => {
    Reflector.defineMetadata<Constructor[]>(
      'dependencies',
      dependencies,
      originalClass,
    );
  };
}
