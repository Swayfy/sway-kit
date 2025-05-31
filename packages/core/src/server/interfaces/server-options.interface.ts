import { AnonymousRoute } from '../../router/types/anonymous-route.type.ts';
import { AppConfig } from '../../state/interfaces/app-config.interface.ts';
import { Constructor } from '../../utils/interfaces/constructor.interface.ts';
import { Controller } from '../../router/controller.class.ts';
import { DeepPartial } from '../../utils/types/deep-partial.type.ts';
import { Module } from '../interfaces/module.interface.ts';
import { Plugin } from './plugin.interface.ts';

export interface ServerOptions {
  config?: DeepPartial<AppConfig>;
  controllers?: Constructor<Controller>[];
  modules?: Constructor<Module>[];
  plugins?: Plugin[];
  routes?: AnonymousRoute[];
}
