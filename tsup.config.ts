import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/**/*.ts',],
    bundle: false,
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: 'esnext',
    outDir: 'dist',
    tsconfig: './tsconfig.json',
    external: ['events'], // EventEmitter de Node.js
});