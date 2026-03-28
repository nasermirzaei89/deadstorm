import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    base: './',
    build: {
        assetsInlineLimit: 0,
        outDir: 'dist',
        emptyOutDir: true,
    },
});
