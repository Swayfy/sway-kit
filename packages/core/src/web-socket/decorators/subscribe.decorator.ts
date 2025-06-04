import { MethodDecorator } from '../../utils/types/method-decorator.type.ts';
import { Reflector } from '../../utils/reflector.class.ts';

export function Subscribe(event: string): MethodDecorator {
  return (originalMethod) => {
    Reflector.defineMetadata<string>('subscribeToEvent', event, originalMethod);

    return originalMethod;
  };
}
