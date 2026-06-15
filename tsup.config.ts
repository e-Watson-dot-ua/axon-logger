import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/plugin.ts'],
  format: ['esm'],
  target: 'es2022',
  outDir: 'dist',
  dts: true,
  clean: true,
  // Shared code (the Logger class) is emitted once as a chunk both entries
  // reference, so `instanceof Logger` holds across the main and /plugin exports.
  splitting: true,
  sourcemap: false,
  treeshake: true,
});
