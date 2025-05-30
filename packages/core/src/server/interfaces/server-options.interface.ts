import { AnonymousRoute } from '../../router/types/anonymous-route.type';
import { AppConfig } from '../../app/interfaces/app-config.interface';
import { Constructor } from '../../utils/interfaces/constructor.interface';
import { Controller } from '../../router/controller.class';
import { DeepPartial } from '../../utils/types/deep-partial.type';
import { Module } from '../interfaces/module.interface';
import { Plugin } from './plugin.interface';

export interface ServerOptions {
  config?: DeepPartial<AppConfig>;
  controllers?: Constructor<Controller>[];
  modules?: Constructor<Module>[];
  plugins?: Plugin[];
  routes?: AnonymousRoute[];
}
