import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  dts: false,
  sourcemap: false,
  splitting: false,
  outExtension: () => ({ js: '.mjs' }),
  banner: {
    js: '#!/usr/bin/env node',
  },
});
