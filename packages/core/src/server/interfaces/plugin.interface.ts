import { Channel } from '../../web-socket/channel.class.ts';
import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Controller } from '../../router/controller.class.ts';
import { Module } from '../../server/interfaces/module.interface.ts';
import { Route } from '../../router/interfaces/route.interface.ts';

export interface Plugin {
  channels?: Constructor<Channel>[];
  controllers?: Constructor<Controller>[];
  modules?: Constructor<Module>[];
  name: string;
  onLoad?: () => void | Promise<void>;
  routes?: Route[];
}
