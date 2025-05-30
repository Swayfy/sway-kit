import { createServer } from '@sway-kit/core';
import { RootModule } from './root.module.ts';

const server = createServer({
  config: {
    
  },
  modules: [
    RootModule,
  ],
});

await server.start();

