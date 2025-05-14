import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // KB単位、警告の上限を1MBに変更
  },

  plugins: [
    react(),
    visualizer({
      open: true, // ビルド後に自動でブラウザで開く
      filename: 'stats.html', // 出力先
      gzipSize: true,
      brotliSize: true,
    }),
  ],
})