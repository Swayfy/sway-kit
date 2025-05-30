import { EnumValuesUnion } from '../../utils/types/enum-values-union.type.ts';
import { HttpMethod } from '../../http/enums/http-method.enum.ts';
import { RouteOptions } from '../interfaces/route-options.interface.ts';
import { RoutePath } from './route-path.type.ts';

export type AnonymousRoute = [
  RoutePath,
  EnumValuesUnion<HttpMethod>[],
  (...args: unknown[]) => unknown | Promise<unknown>,
  RouteOptions?,
];
