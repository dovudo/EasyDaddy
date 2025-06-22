import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  // This will copy manifest.json and popup.html to the dist folder
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // This is the key change: It prevents Vite from creating a separate CSS file
    // and instead injects the styles directly into the document's <head>.
    // This is the most reliable method for Chrome Extension popups.
    cssCodeSplit: false,

    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        'pdf-worker': 'node_modules/pdfjs-dist/build/pdf.worker.min.js',
      },
      output: {
        entryFileNames: '[name].js',
        // All other files will go here
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    // Keep watch mode for development
    watch: {},
    minify: false,
  },
});
