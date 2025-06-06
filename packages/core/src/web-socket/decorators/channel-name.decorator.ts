import { ClassDecorator } from '../../utils/types/class-decorator.type.ts';
import { Reflector } from '../../utils/reflector.class.ts';

export function ChannelName(name: string): ClassDecorator {
  return (originalClass) => {
    Reflector.defineMetadata<string>('name', name, originalClass);
  };
}
