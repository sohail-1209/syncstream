
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncstream.app',
  appName: 'SyncStream',
  server: {
    // For local development, point this to your Next.js dev server.
    // For production, you will replace this with your deployed app's URL.
    url: 'http://localhost:9002',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
