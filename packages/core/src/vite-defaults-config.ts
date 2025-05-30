import { builtinModules } from 'node:module';
import { readFile } from 'node:fs/promises';
import swc from 'vite-plugin-swc-transform';

export async function viteDefaultsConfig() {
  const dependencies =
    JSON.parse(
      await readFile(new URL('./package.json', import.meta.url), 'utf-8'),
    ).dependencies || {};

  return {
    build: {
      target: 'esnext',
      sourcemap: true,
      lib: {
        entry: './src/main.ts',
        formats: ['es'],
      },
      rollupOptions: {
        external: [
          ...Object.keys(dependencies),
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
  };
}
