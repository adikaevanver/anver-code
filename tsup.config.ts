import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['bin/anver.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  clean: true,
  // Shebang is added to the bin entry via package.json "bin" field
  // Node.js handles it when run via npm link / npx
});
