import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: './src/index.ts',
                name: 'EventDispatcher',
                browser: './src/browser/index.ts',
                node: './src/node/index.ts'
            },
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'js'}`
        },
        rollupOptions: {
            external: [/^node:/, 'events']
        }
    }
});