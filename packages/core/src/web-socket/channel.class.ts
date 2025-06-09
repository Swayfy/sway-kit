import { WebSocket } from 'ws';
import { Reflector } from '../utils/reflector.class.ts';

export abstract class Channel {
  public readonly activeSockets = new Map<string, WebSocket>();

  public authorize(_socket: WebSocket): boolean | Promise<boolean> {
    return true;
  }

  public broadcast(
    payload: Record<string, unknown> = {},
    channel?: string,
  ): void {
    for (const socket of this.activeSockets.values()) {
      if (!channel) {
        channel = Reflector.getMetadata<string>('name', this.constructor);
      }

      const path = `${channel?.[0] === '/' ? '' : '/'}${channel}`;

      // @ts-ignore URLPattern is temporarily not declared globally by @types/node
      const pattern = new URLPattern({
        pathname: path,
      });

      if (pattern?.test({ pathname: path })) {
        socket?.send(
          JSON.stringify({
            channel,
            payload,
          }),
        );
      }
    }
  }
}
