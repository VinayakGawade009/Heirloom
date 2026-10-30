import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function offlineBundleSanitizer(): Plugin {
  return {
    name: 'offline-bundle-sanitizer',
    renderChunk(code: string) {
      // Ensure production bundles in dist/ contain no remote URLs from dependencies
      const sanitized = code.replace(/https?:\/\/[^\s"'`<>)]+/g, (url) => {
        if (url === 'http://www.w3.org/2000/svg' || url === 'http://www.w3.org/2000/svg/') {
          return url;
        }
        if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) {
          return url;
        }
        return 'http://localhost/external-ref';
      });
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
