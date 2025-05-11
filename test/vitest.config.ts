import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    deps: {
      inline: [/adminizer/],
    }
  },
  resolve: {
    alias: {
      adminizer: '/src',
    }
  },
  esbuild: {
    target: 'es2022',
    supported: {
      decorators: true,
    }
  }
});
