import { useState, useCallback, useRef, useEffect } from 'react';
import { useZxing } from 'react-zxing';
import type { ScanResult } from '../types';
import { detectPlatform } from '../types';

interface ScannerProps {
  onResult: (result: ScanResult) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onResult }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformInfo] = useState(detectPlatform());
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // iOS-friendly video constraints
  const getVideoConstraints = () => {
    if (platformInfo.isIOS) {
      // Conservative constraints for iOS
      return {
        facingMode: 'environment',
        width: { ideal: 640, max: 1024 },
        height: { ideal: 480, max: 768 },
        frameRate: { ideal: 15, max: 30 }
      };
    } else {
      // Higher quality for other platforms
      return {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };
    }
  };

  const { ref } = useZxing({
    onDecodeResult(result) {
      const scanResult: ScanResult = {
        text: result.getText(),
        timestamp: new Date(),
        format: result.getBarcodeFormat?.()?.toString(),
      };
      onResult(scanResult);
      
      // Don't stop scanning immediately on iOS to prevent stream issues
      if (!platformInfo.isIOS) {
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
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const startScanning = useCallback(async () => {
    setError(null);
    
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
        <h2 className="text-xl font-semibold text-center mb-4">QR & Barcode Scanner</h2>
        
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
                Point camera at QR code or barcode
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
    </div>
  );
};

export default Scanner; 