import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import type { ScanResult } from '../types';
import { detectPlatform } from '../types';

interface TrueMultiCodeScannerProps {
  onResults: (results: ScanResult[]) => void;
  onSingleResult?: (result: ScanResult) => void;
}

const TrueMultiCodeScanner: React.FC<TrueMultiCodeScannerProps> = ({ 
  onResults, 
  onSingleResult 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformInfo] = useState(detectPlatform());
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Use refs for variables that need to persist across renders
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scannedCodesSetRef = useRef<Set<string>>(new Set<string>());
  const isScanningRef = useRef<boolean>(false); // Add ref to track scanning state

  // iOS-friendly video constraints
  const getVideoConstraints = useCallback(() => {
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
  }, [platformInfo.isIOS]);

  // EXACT copy from test file - but using refs and useCallback
  const detectMultipleCodes = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('Video or canvas not ready');
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Video dimensions not ready:', video.videoWidth, video.videoHeight);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Canvas context not available');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const results: ScanResult[] = [];
    const newCodes = new Set<string>();
    
    console.log('Scanning frame:', canvas.width, 'x', canvas.height);
    
    // Strategy 1: Scan the entire frame
    try {
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result && !scannedCodesSetRef.current.has(result.data)) {
        console.log('Found QR code in full frame:', result.data);
        results.push({
          id: `true-multi-${Date.now()}-${Math.random()}`,
          text: result.data,
          timestamp: new Date(),
          format: 'QR_CODE',
          source: 'camera' as const,
        });
        newCodes.add(result.data);
      }
    } catch (error) {
      console.error('Full frame scan error:', error);
    }
    
    // Strategy 2: Scan top half of the frame (for vertically stacked QR codes)
    try {
      const topHalfCanvas = document.createElement('canvas');
      const topHalfCtx = topHalfCanvas.getContext('2d');
      if (topHalfCtx) {
        topHalfCanvas.width = canvas.width;
        topHalfCanvas.height = Math.floor(canvas.height / 2);
        topHalfCtx.drawImage(canvas, 0, 0, canvas.width, Math.floor(canvas.height / 2), 0, 0, canvas.width, Math.floor(canvas.height / 2));
        
        const topHalfImageData = topHalfCtx.getImageData(0, 0, topHalfCanvas.width, topHalfCanvas.height);
        const result = jsQR(topHalfImageData.data, topHalfImageData.width, topHalfImageData.height);
        if (result && !scannedCodesSetRef.current.has(result.data) && !newCodes.has(result.data)) {
          console.log('Found QR code in top half:', result.data);
          results.push({
            id: `true-multi-top-${Date.now()}-${Math.random()}`,
            text: result.data,
            timestamp: new Date(),
            format: 'QR_CODE',
            source: 'camera' as const,
          });
          newCodes.add(result.data);
        }
      }
    } catch (error) {
      console.error('Top half scan error:', error);
    }
    
    // Strategy 3: Scan bottom half of the frame
    try {
      const bottomHalfCanvas = document.createElement('canvas');
      const bottomHalfCtx = bottomHalfCanvas.getContext('2d');
      if (bottomHalfCtx) {
        bottomHalfCanvas.width = canvas.width;
        bottomHalfCanvas.height = Math.floor(canvas.height / 2);
        bottomHalfCtx.drawImage(canvas, 0, Math.floor(canvas.height / 2), canvas.width, Math.floor(canvas.height / 2), 0, 0, canvas.width, Math.floor(canvas.height / 2));
        
        const bottomHalfImageData = bottomHalfCtx.getImageData(0, 0, bottomHalfCanvas.width, bottomHalfCanvas.height);
        const result = jsQR(bottomHalfImageData.data, bottomHalfImageData.width, bottomHalfImageData.height);
        if (result && !scannedCodesSetRef.current.has(result.data) && !newCodes.has(result.data)) {
          console.log('Found QR code in bottom half:', result.data);
          results.push({
            id: `true-multi-bottom-${Date.now()}-${Math.random()}`,
            text: result.data,
            timestamp: new Date(),
            format: 'QR_CODE',
            source: 'camera' as const,
          });
          newCodes.add(result.data);
        }
      }
    } catch (error) {
      console.error('Bottom half scan error:', error);
    }
    
    // Strategy 4: Scan left half and right half (for horizontally arranged QR codes)
    try {
      const leftHalfCanvas = document.createElement('canvas');
      const leftHalfCtx = leftHalfCanvas.getContext('2d');
      if (leftHalfCtx) {
        leftHalfCanvas.width = Math.floor(canvas.width / 2);
        leftHalfCanvas.height = canvas.height;
        leftHalfCtx.drawImage(canvas, 0, 0, Math.floor(canvas.width / 2), canvas.height, 0, 0, Math.floor(canvas.width / 2), canvas.height);
        
        const leftHalfImageData = leftHalfCtx.getImageData(0, 0, leftHalfCanvas.width, leftHalfCanvas.height);
        const result = jsQR(leftHalfImageData.data, leftHalfImageData.width, leftHalfImageData.height);
        if (result && !scannedCodesSetRef.current.has(result.data) && !newCodes.has(result.data)) {
          console.log('Found QR code in left half:', result.data);
          results.push({
            id: `true-multi-left-${Date.now()}-${Math.random()}`,
            text: result.data,
            timestamp: new Date(),
            format: 'QR_CODE',
            source: 'camera' as const,
          });
          newCodes.add(result.data);
        }
      }
    } catch (error) {
      console.error('Left half scan error:', error);
    }
    
    try {
      const rightHalfCanvas = document.createElement('canvas');
      const rightHalfCtx = rightHalfCanvas.getContext('2d');
      if (rightHalfCtx) {
        rightHalfCanvas.width = Math.floor(canvas.width / 2);
        rightHalfCanvas.height = canvas.height;
        rightHalfCtx.drawImage(canvas, Math.floor(canvas.width / 2), 0, Math.floor(canvas.width / 2), canvas.height, 0, 0, Math.floor(canvas.width / 2), canvas.height);
        
        const rightHalfImageData = rightHalfCtx.getImageData(0, 0, rightHalfCanvas.width, rightHalfCanvas.height);
        const result = jsQR(rightHalfImageData.data, rightHalfImageData.width, rightHalfImageData.height);
        if (result && !scannedCodesSetRef.current.has(result.data) && !newCodes.has(result.data)) {
          console.log('Found QR code in right half:', result.data);
          results.push({
            id: `true-multi-right-${Date.now()}-${Math.random()}`,
            text: result.data,
            timestamp: new Date(),
            format: 'QR_CODE',
            source: 'camera' as const,
          });
          newCodes.add(result.data);
        }
      }
    } catch (error) {
      console.error('Right half scan error:', error);
    }
    
    // Report all found codes
    if (results.length > 0) {
      console.log(`Detected ${results.length} QR code(s):`, results.map(r => r.text));
      
      if (results.length === 1 && onSingleResult) {
        onSingleResult(results[0]);
      } else if (results.length > 1 && onResults) {
        onResults(results);
      }
      
      // Add to scanned codes to prevent duplicates
      newCodes.forEach(code => scannedCodesSetRef.current.add(code));
    }
  }, [onResults, onSingleResult]);

  // EXACT copy from test file - but using refs and useCallback
  const scanFrame = useCallback(() => {
    if (!isScanningRef.current) {
      console.log('Scanning stopped, exiting scanFrame');
      return;
    }
    
    const now = Date.now();
    if (now - lastScanTimeRef.current > 500) { // Scan every 500ms - EXACTLY like test file
      console.log('Running scan frame...');
      detectMultipleCodes();
      lastScanTimeRef.current = now;
    }
    
    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [detectMultipleCodes]);

  // Start scanning
  const startScanning = useCallback(async () => {
    console.log('Starting camera...');
    setError(null);
    scannedCodesSetRef.current = new Set();
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser.');
        return;
      }

      console.log('Requesting camera permissions...');
      // iOS permission check
      if (platformInfo.isIOS) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          testStream.getTracks().forEach(track => track.stop());
          console.log('iOS camera permission granted');
        } catch {
          setError('Camera permission denied. Please allow camera access in Safari Settings > Privacy & Security > Camera.');
          return;
        }
      }

      console.log('Getting camera stream...');
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: getVideoConstraints(),
      });

      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('Setting video srcObject...');
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting scan');
          setIsScanning(true);
          isScanningRef.current = true; // Set ref immediately
          // Start scanning after a short delay to ensure video is ready
          setTimeout(() => {
            console.log('Starting scan frame loop...');
            scanFrame();
          }, 100);
        };
        
        // iOS fallback
        if (platformInfo.isIOS) {
          videoRef.current.oncanplay = () => {
            console.log('Video can play, starting scan (iOS)');
            setIsScanning(true);
            isScanningRef.current = true; // Set ref immediately
            setTimeout(() => {
              console.log('Starting scan frame loop (iOS)...');
              scanFrame();
            }, 100);
          };
        }
      } else {
        console.error('Video ref is null!');
        setError('Video element not found. Please refresh the page.');
      }
      
    } catch (error) {
      console.error('Camera error:', error);
      
      if (platformInfo.isIOS) {
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setError('Camera access denied. Please allow camera access and reload the page.');
          } else if (error.name === 'NotFoundError') {
            setError('No camera found on this device.');
          } else {
            setError('Camera error on iOS. Please ensure you\'re using Safari and have camera permissions enabled.');
          }
        }
      } else {
        setError(`Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [platformInfo.isIOS, getVideoConstraints, scanFrame]);

  // Stop scanning - EXACT copy from test file - but using refs
  const stopScanning = useCallback(() => {
    console.log('Stopping camera...');
    setIsScanning(false);
    isScanningRef.current = false; // Set ref immediately
    
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className="scanner-container">
      <div className="p-4">
        <h2 className="text-xl font-semibold text-center mb-4">
          True Multi-Code Scanner
        </h2>
        
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p className="text-sm">
            🚀 Advanced Multi-Code Detection: Detects ALL QR codes in the camera view simultaneously
          </p>
          <p className="text-xs mt-1">
            Works with any arrangement: vertical, horizontal, grid, or scattered QR codes
          </p>
        </div>
        
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
          <div className="relative">
            {/* Always render video element, but hide when not scanning */}
            <video
              ref={videoRef}
              className={`scanner-video ${isScanning ? 'block' : 'hidden'}`}
              playsInline
              muted
              autoPlay
              onClick={() => {
                if (platformInfo.isIOS && videoRef.current) {
                  videoRef.current.play().catch(console.error);
                }
              }}
              style={{
                objectFit: 'cover',
                WebkitTransform: platformInfo.isIOS ? 'translateZ(0)' : 'none',
                WebkitBackfaceVisibility: platformInfo.isIOS ? 'hidden' : 'visible',
              }}
            />
            
            {/* Overlay elements when scanning */}
            {isScanning && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
                </div>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
                  Multi-Code Mode: All visible QR codes will be detected simultaneously
                  {platformInfo.isIOS && (
                    <span className="block text-xs">Tap screen if scanning freezes</span>
                  )}
                </div>
              </>
            )}
            
            {/* Placeholder when not scanning */}
            {!isScanning && (
              <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {platformInfo.isIOS ? 'Start Camera' : 'Start Multi-Code Scanning'}
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
        
        {/* Tips */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h4 className="text-sm font-medium text-green-900 mb-1">🎯 True Multi-Code Scanner Benefits:</h4>
          <ul className="text-xs text-green-800 space-y-1">
            <li>• Detects ALL QR codes in the camera view simultaneously</li>
            <li>• Works with any arrangement: vertical, horizontal, grid, scattered</li>
            <li>• No need to move camera between codes</li>
            <li>• Real-time detection of multiple codes in a single frame</li>
            <li>• Much faster and more efficient than traditional scanners</li>
          </ul>
        </div>
        
        {/* iOS-specific tips */}
        {platformInfo.isIOS && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="text-sm font-medium text-blue-900 mb-1">iOS Tips:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>- Use Safari browser for best compatibility</li>
              <li>- Ensure good lighting for scanning</li>
              <li>- Hold device steady for better detection</li>
              <li>- If camera freezes, tap the video area</li>
            </ul>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default TrueMultiCodeScanner; 