import { builtinModules } from 'node:module';
import swc from 'vite-plugin-swc-transform';

export function viteConfigDefaults(packageData: {
  dependencies?: Record<string, string>;
}) {
  return {
    build: {
      assetsDir: './',
      target: 'esnext',
      sourcemap: true,
      lib: {
        entry: './src/main.ts',
        formats: ['es'],
      },
      outDir: './build',
      rollupOptions: {
        external: [
          ...Object.keys(packageData.dependencies || {}),
          ...builtinModules.map((moduleName) => moduleName),
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
  };
}
