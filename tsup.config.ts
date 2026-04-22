import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        browser: 'src/implementations/BrowserEventDispatcher.ts',
        node: 'src/implementations/NodeEventDispatcher.ts',
    },
    format: ['cjs', 'esm'],
    splitting: false,
    dts: true,
    bundle: true,        
    external: ['node:events'], // Pour le dispatcher Node
    clean: true,
    outDir: 'dist',
    outExtension({ format }) {
        return { js: format === 'esm' ? '.mjs' : '.js' };
    },
});