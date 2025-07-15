import { defineConfig, build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // Separate configuration for content script
  if (process.env.BUILD_TARGET === 'content') {
    return {
      plugins: [],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/content.ts'),
          name: 'EasyDaddyContent',
          fileName: 'content',
          formats: ['iife']
        },
        rollupOptions: {
          external: [],
          output: {
            extend: false
          }
        },
        minify: false,
        target: 'es2022'
      }
    };
  }

  // Main configuration for popup and background
  return {
    plugins: [react()],
    publicDir: 'public',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      cssCodeSplit: false,

      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          background: resolve(__dirname, 'src/background.ts'),
          'pdf-worker': 'node_modules/pdfjs-dist/build/pdf.worker.min.js',
        },
        output: {
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name].[ext]',
          format: 'es',
        },
        external: [],
      },
      watch: {},
      minify: false,
    },
  };
});
