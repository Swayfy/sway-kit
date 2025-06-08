import { Inject } from '../injector/decorators/inject.decorator.ts';
import { Request } from '../http/request.class.ts';
import { StateManager } from '../state/state-manager.service.ts';

@Inject([StateManager])
export class ViewRenderer {
  constructor(private readonly stateManager: StateManager) {}

  public async render(
    template: string,
    data: Record<string, unknown>,
    view: string,
    request: Request,
  ): Promise<string> {
    const hotReloadScript = this.stateManager.state.isProduction
      ? ''
      : `
          <script nonce="${request.nonce ?? ''}">
            const $hrSocket = new WebSocket('${
              this.stateManager.state.tls.enabled ? 'wss' : 'ws'
            }://${this.stateManager.state.host}:${this.stateManager.state.webSocket.port}');

            $hrSocket.onmessage = (event) => {
              if (JSON.parse(event.data).channel === '@/hot-reload') {
                window.location.reload();
              }
            };

            $hrSocket.onclose = () => console.error('[@sway-kit/core] Hot reload disconnected');
          </script>
        `;

    return template
      .replaceAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
        if (key in data) {
          return String(data[key]);
        }

        throw new Error(`Missing variable "${key}" in view ${view}`);
      })
      .replace('@hotReload', hotReloadScript);
  }
}
