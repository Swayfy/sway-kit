import { builtinModules } from 'node:module';
import { UserConfig } from 'vite';
import swc from 'vite-plugin-swc-transform';

export function viteConfigDefaults(
  packageData: object & {
    dependencies?: Record<string, string>;
  },
): Partial<UserConfig> {
  return {
    build: {
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
    publicDir: false,
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
