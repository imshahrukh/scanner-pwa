import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scanner.pwa',
  appName: 'QR Scanner',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera']
    }
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff'
  }
};

export default config; 