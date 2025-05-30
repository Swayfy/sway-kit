import { AnonymousRoute } from '../../router/types/anonymous-route.type.ts';
import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Controller } from '../../router/controller.class.ts';

export interface Module {
  readonly controllers?: Constructor<Controller>[];
  readonly routes?: AnonymousRoute[];
  readonly submodules?: Constructor<Module>[];
}
