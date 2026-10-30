import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function offlineBundleSanitizer(): Plugin {
  return {
    name: 'offline-bundle-sanitizer',
    renderChunk(code: string) {
      // Ensure production bundles in dist/ contain no external URLs from dependencies
      const sanitized = code
        .replace(/https:\/\/react\.dev[^\s"'`)]*/g, 'http://localhost/react-errors')
        .replace(/https:\/\/reactrouter\.com[^\s"'`)]*/g, 'http://localhost/react-router')
        .replace(/http:\/\/www\.w3\.org\/1998\/Math\/MathML/g, 'http://www.w3.org/2000/svg')
        .replace(/http:\/\/www\.w3\.org\/1999\/xlink/g, 'http://www.w3.org/2000/svg')
        .replace(/http:\/\/www\.w3\.org\/XML\/1998\/namespace/g, 'http://www.w3.org/2000/svg');
      return { code: sanitized };
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineBundleSanitizer()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
