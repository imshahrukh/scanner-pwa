export interface ScanResult {
  id: string;
  text: string;
  format: string;
  timestamp: Date;
  confidence?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  source: 'camera' | 'image' | 'batch';
  isDuplicate?: boolean;
}

export interface MultiScanResult {
  results: ScanResult[];
  frameCount: number;
  processingTime: number;
  totalCodesFound: number;
}

export interface ScannerConfig {
  enableMultiScan: boolean;
  scanInterval: number;
  confidenceThreshold: number;
  maxCodesPerFrame: number;
  enableDuplicateDetection: boolean;
  enableRealTimeProcessing: boolean;
  cameraResolution: 'low' | 'medium' | 'high';
  scanMode: 'continuous' | 'single-shot' | 'burst';
}

export interface CameraState {
  isActive: boolean;
  isInitializing: boolean;
  hasPermission: boolean;
  error: string | null;
  stream: MediaStream | null;
}

export interface ProcessingStats {
  framesProcessed: number;
  codesDetected: number;
  averageProcessingTime: number;
  fps: number;
  lastUpdate: Date;
}

export interface ScanSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  results: ScanResult[];
  config: ScannerConfig;
  stats: ProcessingStats;
}

export type ScanMode = 'single' | 'multi' | 'batch' | 'continuous';
export type CameraFacing = 'environment' | 'user';
export type ProcessingMode = 'realtime' | 'optimized' | 'high-accuracy';

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