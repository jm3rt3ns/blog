// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jackmertens.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [mdx(), react()],
  markdown: {
    shikiConfig: {
      // Dual theme: Shiki emits both palettes as CSS variables so the
      // light/dark swap costs zero client JS. See src/styles/theme.css.
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'light',
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
