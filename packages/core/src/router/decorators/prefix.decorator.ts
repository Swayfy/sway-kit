import { ClassDecorator } from '../../utils/types/class-decorator.type.ts';
import { Reflector } from '../../utils/reflector.class.ts';
import { RoutePath } from '../types/route-path.type.ts';

export function Prefix(prefix: RoutePath): ClassDecorator {
  return (originalClass) => {
    Reflector.defineMetadata<RoutePath>('prefix', prefix, originalClass);
  };
}
