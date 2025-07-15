import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface NativeCameraResult {
  dataUrl: string;
  webPath?: string;
}

export class NativeCameraService {
  static isNativeAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  static async checkPermissions(): Promise<boolean> {
    if (!this.isNativeAvailable()) {
      return true; // Web permissions handled by browser
    }

    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  static async requestPermissions(): Promise<boolean> {
    if (!this.isNativeAvailable()) {
      return true; // Web permissions handled by browser
    }

    try {
      const permissions = await Camera.requestPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  static async takePicture(): Promise<NativeCameraResult | null> {
    if (!this.isNativeAvailable()) {
      throw new Error('Native camera not available - use web camera instead');
    }

    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Camera permission denied');
        }
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      return {
        dataUrl: image.dataUrl!,
        webPath: image.webPath
      };
    } catch (error) {
      console.error('Error taking picture:', error);
      return null;
    }
  }
} 