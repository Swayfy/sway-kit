import packageData from './package.json' with { type: 'json' };
import { defineConfig } from 'vite';
import { viteConfigDefaults } from '@sway-kit/core/vite';

export default defineConfig({
  logLevel: 'error',
  ...viteConfigDefaults(packageData),
});
