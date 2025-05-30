import { Constructor } from '../../utils/interfaces/constructor.interface';
import { Injector } from '../injector.class';

export function resolve<TService>(service: Constructor<TService>): TService {
  return Injector.resolve<TService>(service);
}
