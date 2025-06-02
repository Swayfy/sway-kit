import { ClassDecorator } from '../../utils/types/class-decorator.type.ts';
import { Reflector } from '../../utils/reflector.class.ts';

export function Cookies(cookies: Record<string, string>): ClassDecorator {
  return (originalClass) => {
    Reflector.defineMetadata<Record<string, string>>(
      'cookies',
      cookies,
      originalClass,
    );
  };
}
