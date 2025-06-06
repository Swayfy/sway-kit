import { Channel } from '../../web-socket/channel.class.ts';
import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Controller } from '../../router/controller.class.ts';
import { Route } from '../../router/interfaces/route.interface.ts';

export interface Module {
  readonly channels?: Constructor<Channel>[];
  readonly controllers?: Constructor<Controller>[];
  readonly imports?: Constructor<Module>[];
  readonly routes?: Route[];
}
