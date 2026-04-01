import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['bin/anver.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist/bin',
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
