import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const frontendDir = path.resolve(__dirname, 'frontend');

function getHtmlInputs() {
  if (!fs.existsSync(frontendDir)) return {};
  const inputs: Record<string, string> = {};
  for (const entry of fs.readdirSync(frontendDir)) {
    if (entry.endsWith('.html')) {
      const name = entry.replace(/\.html$/, '');
      inputs[name] = path.resolve(frontendDir, entry);
    }
  }
  return inputs;
}

export default defineConfig(() => {
  return {
    root: frontendDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: getHtmlInputs(),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
