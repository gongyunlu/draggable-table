import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@draggable-table',
  description: 'React 19+ draggable tree table component library',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/intro' },
      { text: 'API', link: '/api/table' },
    ],
    sidebar: {
      '/guide/': [{ text: 'Introduction', link: '/guide/intro' }],
      '/api/': [{ text: 'Table', link: '/api/table' }],
    },
  },
})
