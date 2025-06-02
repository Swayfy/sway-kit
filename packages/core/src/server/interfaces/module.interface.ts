import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Controller } from '../../router/controller.class.ts';
import { Route } from '../../router/interfaces/route.interface.ts';

export interface Module {
  readonly controllers?: Constructor<Controller>[];
  readonly routes?: Route[];
  readonly submodules?: Constructor<Module>[];
}
