import { Request } from '../../http/request.class.ts';

export interface Middleware {
  handle: (params: string[], request: Request) => void | Promise<void>;
}
