export interface ScanResult {
  text: string;
  timestamp: Date;
  format?: string;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface CameraConstraints {
  audio: boolean;
  video: {
    facingMode: string;
    width: { ideal: number };
    height: { ideal: number };
  };
} 

export interface PlatformInfo {
  isIOS: boolean;
  isSafari: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isNative: boolean;
  hasNativeCamera: boolean;
}

// Extend navigator interface for iOS standalone detection
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

// Extend window interface for Capacitor detection
interface WindowWithCapacitor extends Window {
  Capacitor?: {
    isNativePlatform(): boolean;
  };
}

// Utility functions for platform detection
export const detectPlatform = (): PlatformInfo => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /ipad|iphone|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  
  // Detect if already installed as PWA (standalone mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (navigator as NavigatorStandalone).standalone === true ||
                      document.referrer.includes('android-app://');
  
  // Detect if running in Capacitor native app
  const isNative = !!((window as WindowWithCapacitor).Capacitor?.isNativePlatform?.());
  
  // Native camera available if running in Capacitor
  const hasNativeCamera = isNative;
  
  // Can install if iOS Safari and not already standalone
  const canInstall = isIOS && isSafari && !isStandalone;
  
  return {
    isIOS,
    isSafari,
    isStandalone,
    canInstall,
    isNative,
    hasNativeCamera
  };
}; 