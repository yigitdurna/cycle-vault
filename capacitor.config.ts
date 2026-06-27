import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yigitdurna.cyclevault',
  appName: 'cycle vault',
  // Vite outputs the production build here. Build with `npm run build:ios`
  // (which sets CAP_BUILD=1 so Vite uses base '/' instead of '/cycle-vault/').
  webDir: 'dist',
  backgroundColor: '#FAF6F1',
  ios: {
    contentInset: 'always',
  },
};

export default config;
