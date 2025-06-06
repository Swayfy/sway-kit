import { MethodDecorator } from '../../utils/types/method-decorator.type.ts';
import { Reflector } from '../../utils/reflector.class.ts';

export function Subscribe(eventName: string): MethodDecorator {
  return (originalMethod) => {
    Reflector.defineMetadata<string>('subscription', eventName, originalMethod);

    return originalMethod;
  };
}
