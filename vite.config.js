// vite.config.js
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
        },
    },
    server: {
        headers: {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api-komikcast.vercel.app https://*.vercel.app https://*.google.com https://*.googlesyndication.com https://va.vercel-scripts.com ws://localhost:*; frame-src 'self' https://*.google.com https://*.googlesyndication.com; object-src 'none'; base-uri 'self'; form-action 'self';"
        },
        hmr: {
            protocol: 'ws',
            host: 'localhost'
        }
    },
    build: {
        // Optimize build output
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false, // Disable sourcemaps in production for smaller bundle
        minify: 'esbuild', // Use esbuild for faster builds (built-in, no extra dependency)
        // esbuild minify options
        esbuild: {
            drop: ['console', 'debugger'], // Remove console.log and debugger in production
        },
        // Code splitting optimization
        rollupOptions: {
            output: {
                // Manual chunk splitting for better caching
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'react-icons': ['react-icons'],
                    'utils': ['axios'],
                },
                // Optimize chunk file names
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name.split('.');
                    const ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                        return `assets/img/[name]-[hash][extname]`;
                    }
                    if (/woff2?|eot|ttf|otf/i.test(ext)) {
                        return `assets/fonts/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                },
            },
        },
        // Chunk size warning limit
        chunkSizeWarningLimit: 1000,
        // Optimize asset inlining
        assetsInlineLimit: 4096, // 4kb
    },
    // Optimize dependencies pre-bundling
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
    },
})
