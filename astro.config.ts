import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jalols.page',
  output: 'static',
  build: {
    format: 'preserve',
  },
  devToolbar: {
    enabled: false,
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: false,
    },
  },
});
