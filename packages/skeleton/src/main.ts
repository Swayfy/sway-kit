import { createServer } from '@sway-kit/core';
import { RootModule } from './root.module.ts';

const server = createServer({
  config: {
    contentSecurityPolicy: {
      allowedOrigins: ['https://fonts.googleapis.com'],
    },
  },
  modules: [
    RootModule,
  ],
});

await server.start();
