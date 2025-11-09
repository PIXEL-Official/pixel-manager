import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  envDir: '/tmp', // Point to temp directory to avoid .env file permission issues
  envPrefix: 'VITE_', // Disable .env file loading
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'dist/',
        '**/*.d.ts',
        'src/index.ts',
      ],
    },
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

