import { ClassDecorator } from '../../utils/types/class-decorator.type.ts';
import { Reflector } from '../../utils/reflector.class.ts';

export function Cors(): ClassDecorator {
  return (originalClass) => {
    Reflector.defineMetadata<boolean>('cors', true, originalClass);
  };
}
