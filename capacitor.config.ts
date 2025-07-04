
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncstream.app',
  appName: 'SyncStream',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
