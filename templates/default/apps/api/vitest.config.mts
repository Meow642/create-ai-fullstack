import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    setupFiles: ['./src/test/setup.ts'],
  },
});
