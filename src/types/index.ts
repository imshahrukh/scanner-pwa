export interface ScanResult {
  text: string;
  timestamp: Date;
  format?: string;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface ScannerError {
  message: string;
  code?: string;
}

export interface CameraConstraints {
  audio: boolean;
  video: {
    facingMode: string;
    width: { ideal: number };
    height: { ideal: number };
  };
} 