import { ChannelName } from '../../web-socket/decorators/channel-name.decorator.ts';
import { Channel } from '../../web-socket/channel.class.ts';

@ChannelName('@/hot-reload')
export class HotReloadChannel extends Channel {
  public override authorize(): boolean {
    return true;
  }

  public sendReloadRequest() {
    this.broadcast({
      reload: true,
    });
  }
}
