import { ClassDecorator } from '../../utils/types/class-decorator.type.ts';
import { HttpMethod } from '../../http/enums/http-method.enum.ts';
import { MethodDecorator } from '../../utils/types/method-decorator.type.ts';
import { Reflector } from '../../utils/reflector.class.ts';
import { resolve } from '../../injector/functions/resolve.function.ts';
import { Router } from '../router.service.ts';
import { RoutePath } from '../types/route-path.type.ts';

const router = resolve(Router);

export const Any = router.createRouteDecorator(Object.values(HttpMethod));

export const Copy = router.createRouteDecorator([HttpMethod.Copy]);

export const Delete = router.createRouteDecorator([HttpMethod.Delete]);

export const Get = router.createRouteDecorator([HttpMethod.Get]);

export const Head = router.createRouteDecorator([HttpMethod.Head]);

export const Lock = router.createRouteDecorator([HttpMethod.Lock]);

export const Mkcol = router.createRouteDecorator([HttpMethod.Mkcol]);

export const Move = router.createRouteDecorator([HttpMethod.Move]);

export const Options = router.createRouteDecorator([HttpMethod.Options]);

export const Patch = router.createRouteDecorator([HttpMethod.Patch]);

export const Post = router.createRouteDecorator([HttpMethod.Post]);

export const PropFind = router.createRouteDecorator([HttpMethod.PropFind]);

export const PropPatch = router.createRouteDecorator([HttpMethod.PropPatch]);

export const Put = router.createRouteDecorator([HttpMethod.Put]);

export const Search = router.createRouteDecorator([HttpMethod.Search]);

export const Trace = router.createRouteDecorator([HttpMethod.Trace]);

export const Unlock = router.createRouteDecorator([HttpMethod.Unlock]);

export const Methods = router.createRouteDecorator();

export function Error(): MethodDecorator {
  return (originalMethod) => {
    Reflector.defineMetadata<boolean>('httpErrorHandler', true, originalMethod);

    return originalMethod;
  };
}

export function Prefix(prefix: RoutePath): ClassDecorator {
  return (originalClass) => {
    Reflector.defineMetadata<RoutePath>('prefix', prefix, originalClass);
  };
}
