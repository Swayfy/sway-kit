import { EnumValuesUnion } from '../../utils/types/enum-values-union.type.ts';
import { HttpMethod } from '../../http/enums/http-method.enum.ts';
import { RouteOptions } from './route-options.interface.ts';
import { RoutePath } from '../types/route-path.type.ts';

export interface Route extends RouteOptions {
  action: (...args: unknown[]) => unknown | Promise<unknown>;
  methods: EnumValuesUnion<HttpMethod>[];
  path: RoutePath;
}
