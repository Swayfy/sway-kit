import packageData from './package.json' with { type: 'json' };
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import swc from 'vite-plugin-swc-transform';

export default defineConfig({
  logLevel: 'error',
  build: {
    target: 'esnext',
    sourcemap: true,
    lib: {
      entry: './src/exports.ts',
      formats: ['es'],
    },
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
    outDir: './build',
    assetsDir: './',
  },
  plugins: [
    swc({
      swcOptions: {
        minify: true,
        jsc: {
          minify: {
            compress: {
              unused: true,
            },
            mangle: true,
          },
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
