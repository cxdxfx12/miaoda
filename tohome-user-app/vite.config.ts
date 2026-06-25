import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const rnw = path.resolve(__dirname, 'node_modules/react-native-web');

// 存放 web 垫片
const shims = path.resolve(__dirname, 'src/web-shims');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ⚠️ 特定路径必须在泛型 react-native 之前
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(shims, 'codegenNativeComponent.ts'),
      'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(shims, 'codegenNativeCommands.ts'),
      'react-native/Libraries/Image/Image': rnw,
      'react-native': rnw,
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  define: {
    __DEV__: JSON.stringify(true),
  },
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    include: ['react-native-web'],
    exclude: ['@expo/vector-icons'],
    esbuild: {
      loader: { '.js': 'jsx' },
    },
  },
});