import { AnonymousRoute } from '../../router/types/anonymous-route.type.ts';
import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Controller } from '../../router/controller.class.ts';
import { Module } from '../../server/interfaces/module.interface.ts';

export interface Plugin {
  controllers?: Constructor<Controller>[];
  modules?: Constructor<Module>[];
  name: string;
  onLoad?: () => void | Promise<void>;
  routes?: AnonymousRoute[];
}
