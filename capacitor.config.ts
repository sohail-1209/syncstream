import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncstream.app',
  appName: 'SyncStream',
  server: {
    // Updated to point to your deployed Firebase Hosting URL
    url: 'https://studio--syncstream-ptp6x.us-central1.hosted.app',
    cleartext: false, // false since it's HTTPS
    androidScheme: 'https'
  }
};

export default config;
