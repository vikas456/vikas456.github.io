// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.vikasperaka.com',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    // Emit /404.html and clean URLs that GitHub Pages serves directly.
    format: 'file',
    inlineStylesheets: 'auto',
  },
  image: {
    // Portrait is the only processed image today; keep the service explicit.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
