import { defineConfig } from 'vite';
import { viteDefaultsConfig } from '@sway-kit/core';

export default defineConfig({
  logLevel: 'error',
  ...(await viteDefaultsConfig()),
});
