import { useState, useCallback, useRef, useEffect } from 'react';
import { useZxing } from 'react-zxing';
import { BrowserMultiFormatReader } from '@zxing/library';
import type { ScanResult } from '../types';
import { detectPlatform } from '../types';

interface EnhancedScannerProps {
  onResult: (result: ScanResult) => void;
  onMultiResults?: (results: ScanResult[]) => void;
  enableMultiScan?: boolean;
}

const EnhancedScanner: React.FC<EnhancedScannerProps> = ({ 
  onResult, 
  onMultiResults,
  enableMultiScan = false 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformInfo] = useState(detectPlatform());
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [scannedCodes, setScannedCodes] = useState<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const multiScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // iOS-friendly video constraints
  const getVideoConstraints = () => {
    if (platformInfo.isIOS) {
      return {
        facingMode: 'environment',
        width: { ideal: 640, max: 1024 },
        height: { ideal: 480, max: 768 },
        frameRate: { ideal: 15, max: 30 }
      };
    } else {
      return {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };
    }
  };

  // Enhanced multi-code detection
  const detectMultipleCodes = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!enableMultiScan || !onMultiResults) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(videoElement, 0, 0);

    try {

      const reader = new BrowserMultiFormatReader();
      
      const results: ScanResult[] = [];
      const newCodes = new Set<string>();

      // Try different scanning strategies for multiple codes
      const strategies = [
        // Strategy 1: Direct scan with multiple format support
        async () => {
          const result = await reader.decodeFromImage(canvas.toDataURL());
          return result;
        },
        // Strategy 2: Region-based scanning (divide frame into quadrants)
        async () => {
          const regions = [
            { x: 0, y: 0, w: canvas.width / 2, h: canvas.height / 2 },
            { x: canvas.width / 2, y: 0, w: canvas.width / 2, h: canvas.height / 2 },
            { x: 0, y: canvas.height / 2, w: canvas.width / 2, h: canvas.height / 2 },
            { x: canvas.width / 2, y: canvas.height / 2, w: canvas.width / 2, h: canvas.height / 2 }
          ];

          for (const region of regions) {
            try {
              // Create a temporary canvas for this region
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d');
              if (!tempCtx) continue;
              
              tempCanvas.width = region.w;
              tempCanvas.height = region.h;
              tempCtx.drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
              
              const result = await reader.decodeFromImage(tempCanvas.toDataURL());
              return result;
            } catch (e) {
              // Continue to next region
            }
          }
          return null;
        }
      ];

      // Try each strategy
      for (const strategy of strategies) {
        try {
          const result = await strategy();
          if (result && !newCodes.has(result.getText())) {
            newCodes.add(result.getText());
            results.push({
              text: result.getText(),
              timestamp: new Date(),
              format: result.getBarcodeFormat?.()?.toString(),
            });
          }
        } catch (e) {
          // Continue to next strategy
        }
      }

      // If we found multiple codes, report them
      if (results.length > 1) {
        onMultiResults(results);
        // Add to scanned codes to prevent duplicates
        setScannedCodes(prev => new Set([...prev, ...newCodes]));
      }

    } catch (error) {
      // Silent error - multi-scan is optional
      console.debug('Multi-scan error:', error);
    }
  }, [enableMultiScan, onMultiResults]);

  const { ref } = useZxing({
    onDecodeResult(result) {
      const now = Date.now();
      const scanResult: ScanResult = {
        text: result.getText(),
        timestamp: new Date(),
        format: result.getBarcodeFormat?.()?.toString(),
      };

      // Check if we've already scanned this code recently
      if (scannedCodes.has(scanResult.text)) {
        return;
      }

      // Add to scanned codes
      setScannedCodes(prev => new Set([...prev, scanResult.text]));

      // Rate limiting to prevent rapid duplicate scans
      if (now - lastScanTime < 1000) {
        return;
      }
      setLastScanTime(now);

      onResult(scanResult);
      
      // If multi-scan is enabled, try to detect more codes in the same frame
      if (enableMultiScan && ref.current) {
        // Clear any existing timeout
        if (multiScanTimeoutRef.current) {
          clearTimeout(multiScanTimeoutRef.current);
        }

        // Wait a bit then try multi-scan
        multiScanTimeoutRef.current = setTimeout(() => {
          detectMultipleCodes(ref.current!);
        }, 200);
      }
      
      // Don't stop scanning immediately on iOS to prevent stream issues
      if (!platformInfo.isIOS && !enableMultiScan) {
        setIsScanning(false);
      }
    },
    onDecodeError(error) {
      // Silent error handling - scanning continues
      console.debug('Scan decode error:', error);
    },
    constraints: {
      audio: false,
      video: getVideoConstraints(),
    },
    paused: !isScanning,
  });

  // Cleanup function for media streams
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (multiScanTimeoutRef.current) {
      clearTimeout(multiScanTimeoutRef.current);
    }
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const startScanning = useCallback(async () => {
    setError(null);
    setScannedCodes(new Set());
    
    try {
      // Check if camera access is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser.');
        return;
      }

      // For iOS, add additional permission check
      if (platformInfo.isIOS) {
        try {
          // Test camera access with minimal constraints first
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          testStream.getTracks().forEach(track => track.stop());
        } catch {
          setError('Camera permission denied. Please allow camera access in Safari Settings > Privacy & Security > Camera.');
          return;
        }
      }

      setIsScanning(true);
      
      // Store reference to video element for cleanup
      if (ref.current) {
        videoRef.current = ref.current;
        
        // Listen for stream changes to store reference
        const handleLoadedMetadata = () => {
          if (ref.current?.srcObject instanceof MediaStream) {
            streamRef.current = ref.current.srcObject;
          }
        };
        
        ref.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        return () => {
          ref.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      }
      
    } catch (error) {
      console.error('Camera error:', error);
      
      // iOS-specific error messages
      if (platformInfo.isIOS) {
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setError('Camera access denied. Please allow camera access and reload the page.');
          } else if (error.name === 'NotFoundError') {
            setError('No camera found on this device.');
          } else if (error.name === 'OverconstrainedError') {
            setError('Camera constraints not supported. Try using a different device orientation.');
          } else {
            setError('Camera error on iOS. Please ensure you\'re using Safari and have camera permissions enabled.');
          }
        }
      } else {
        setError(`Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      setIsScanning(false);
    }
  }, [ref, platformInfo.isIOS]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    
    // Add a small delay before cleanup to prevent iOS crashes
    setTimeout(() => {
      cleanupStream();
    }, platformInfo.isIOS ? 500 : 100);
  }, [cleanupStream, platformInfo.isIOS]);

  return (
    <div className="scanner-container">
      <div className="p-4">
        <h2 className="text-xl font-semibold text-center mb-4">
          {enableMultiScan ? 'Enhanced Multi-Code Scanner' : 'QR & Barcode Scanner'}
        </h2>
        
        {enableMultiScan && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            <p className="text-sm">
              🚀 Enhanced Mode: Attempting to detect multiple codes in each frame
            </p>
          </div>
        )}
        
        {/* iOS-specific warning for HTTPS */}
        {platformInfo.isIOS && !window.location.protocol.includes('https') && (
          <div className="mb-4 p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded">
            <p className="text-sm">
              ⚠️ Camera requires HTTPS on iOS. Please use a secure connection for best results.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="text-sm">{error}</p>
            {platformInfo.isIOS && error.includes('permission') && (
              <p className="text-xs mt-2">
                iOS Tip: Go to Settings {'->'} Safari {'->'} Camera and ensure camera access is allowed.
              </p>
            )}
          </div>
        )}

        <div className="relative mb-4">
          {isScanning ? (
            <div className="relative">
              <video
                ref={ref}
                className="scanner-video"
                playsInline
                muted
                autoPlay
                style={{
                  objectFit: 'cover',
                  // iOS-specific fixes
                  WebkitTransform: platformInfo.isIOS ? 'translateZ(0)' : 'none',
                  WebkitBackfaceVisibility: platformInfo.isIOS ? 'hidden' : 'visible',
                }}
              />
              <div className="absolute inset-0 border-2 border-primary-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary-500"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary-500"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary-500"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary-500"></div>
              </div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                {enableMultiScan 
                  ? 'Point camera at multiple QR codes'
                  : 'Point camera at QR code or barcode'
                }
                {platformInfo.isIOS && (
                  <span className="block text-xs">Tap screen if scanning freezes</span>
                )}
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-primary-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h.01M9 12h.01M9 15h.01M12 9h.01M12 12h.01M12 15h.01M15 9h.01M15 12h.01M15 15h.01" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm">Camera preview will appear here</p>
                {platformInfo.isIOS && (
                  <p className="text-gray-500 text-xs mt-1">iOS requires camera permissions</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!isScanning ? (
            <button
              onClick={startScanning}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              {platformInfo.isIOS ? 'Start Camera' : 'Start Scanning'}
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop Camera
            </button>
          )}
        </div>
        
        {/* Enhanced mode tips */}
        {enableMultiScan && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Enhanced Multi-Code Tips:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>- Position multiple QR codes in the camera view</li>
              <li>- Ensure all codes are clearly visible and well-lit</li>
              <li>- Hold device steady for better detection</li>
              <li>- The scanner will attempt to detect all codes simultaneously</li>
            </ul>
          </div>
        )}
        
        {/* iOS-specific tips */}
        {platformInfo.isIOS && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="text-sm font-medium text-blue-900 mb-1">iOS Tips:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>- Use Safari browser for best compatibility</li>
              <li>- Ensure good lighting for scanning</li>
              <li>- Hold device steady and close to QR code</li>
              <li>- If camera freezes, tap the video area</li>
            </ul>
          </div>
        )}
      </div>

      {/* Hidden canvas for multi-scan processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default EnhancedScanner; 