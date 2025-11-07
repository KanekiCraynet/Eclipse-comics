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
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api-komikcast.vercel.app https://*.vercel.app https://*.google.com https://*.googlesyndication.com; frame-src 'self' https://*.google.com https://*.googlesyndication.com; object-src 'none'; base-uri 'self'; form-action 'self';"
        }
    }
})
