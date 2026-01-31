import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'implementations/BrowserEventDispatcher': 'src/implementations/BrowserEventDispatcher.ts',
        'implementations/NodeEventDispatcher': 'src/implementations/NodeEventDispatcher.ts',
        'implementations/SimpleEventDispatcher': 'src/implementations/SimpleEventDispatcher.ts',
    },
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