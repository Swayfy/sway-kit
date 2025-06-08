import packageData from './package.json' with { type: 'json' };
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import swc from 'vite-plugin-swc-transform';

export default defineConfig({
  logLevel: 'error',
  build: {
    target: 'esnext',
    sourcemap: true,
    lib: {
      entry: {
        exports: './src/exports.ts',
        vite: './src/vite-config-defaults.ts',

        ...(process.argv[4] === '--dev'
          ? {}
          : {
              crypto: './src/crypto/crypto.exports.ts',
              error: './src/error/error.exports.ts',
              http: './src/http/http.exports.ts',
              injector: './src/injector/injector.exports.ts',
              logger: './src/logger/logger.exports.ts',
              router: './src/router/router.exports.ts',
              server: './src/server/server.exports.ts',
              state: './src/state/state.exports.ts',
              utils: './src/utils/utils.exports.ts',
              view: './src/view/view.exports.ts',
              'web-socket': './src/web-socket/web-socket.exports.ts',
            }),
      },
      formats: ['es'],
    },
    outDir: './build',
    rollupOptions: {
      external: [
        ...Object.keys(packageData.devDependencies || {}),
        ...Object.keys(packageData.dependencies || {}),
        ...builtinModules.map((moduleName) => `node:${moduleName}`),
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        format: 'es',
        entryFileNames: '[name].js',
      },
    },
  },
  plugins: [
    dts({
      include: ['./src/**/*.ts'],
      rollupTypes: true,
    }),
    swc({
      swcOptions: {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          target: 'es2024',
          transform: {
            decoratorVersion: '2022-03',
          },
        },
      },
    }),
  ],
});
