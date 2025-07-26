import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ScanResult } from '../types';

interface UltraFastOptimizedScannerProps {
  onResults: (results: ScanResult[]) => void;
  onSingleResult?: (result: ScanResult) => void;
  maxCodes?: number;
}

const UltraFastOptimizedScanner: React.FC<UltraFastOptimizedScannerProps> = ({
  onResults,
  onSingleResult,
  maxCodes = 10,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fps, setFps] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);
  const detectedCodesRef = useRef<Set<string>>(new Set());
  const workerRef = useRef<Worker | null>(null);
  const processingQueueRef = useRef<boolean>(false);

  // Platform detection
  const platformInfo = {
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  };

  // Get optimal video constraints for 60 FPS
  const getVideoConstraints = useCallback(() => {
    if (platformInfo.isIOS) {
      return {
        facingMode: 'environment',
        width: { ideal: 1920, max: 2560 },
        height: { ideal: 1080, max: 1440 },
        frameRate: { ideal: 60, max: 120 },
      };
    } else {
      return {
        facingMode: 'environment',
        width: { ideal: 2560, max: 3840 },
        height: { ideal: 1440, max: 2160 },
        frameRate: { ideal: 60, max: 120 },
      };
    }
  }, [platformInfo.isIOS]);

  // Initialize worker
  useEffect(() => {
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(new URL('../workers/ultra-fast-worker.js', import.meta.url), {
          type: 'module'
        });
        
        workerRef.current.onmessage = (e) => {
          console.log('📨 Worker message received:', e.data);
          const { type, data } = e.data;
          
          switch (type) {
            case 'INIT_SUCCESS':
              console.log('🚀 Ultra-fast worker ready');
              break;
              
            case 'FRAME_RESULTS':
              console.log(`📥 Received ${data.results.length} results from worker for frame ${data.frameId}`);
              handleWorkerResults(data.results);
              processingQueueRef.current = false;
              break;
              
            case 'FRAME_ERROR':
              console.error('❌ Worker error:', data.error);
              processingQueueRef.current = false;
              break;
              
            default:
              console.log('❓ Unknown worker message type:', type);
          }
        };
        
        workerRef.current.postMessage({ type: 'INIT' });
        console.log('📤 Sent INIT message to worker');
      } catch (error) {
        console.error('❌ Failed to initialize worker:', error);
        setError('Failed to initialize ultra-fast processing');
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'TERMINATE' });
        workerRef.current.terminate();
      }
    };
  }, []);

  // Handle worker results
  const handleWorkerResults = useCallback((results: Array<{
    text: string;
    format: string;
    timestamp: number;
    confidence: number;
    region: string;
  }>) => {
    if (results.length > 0) {
      const newCodes = results.filter(result => !detectedCodesRef.current.has(result.text));
      
      for (const result of newCodes) {
        detectedCodesRef.current.add(result.text);
        
        const scanResult: ScanResult = {
          id: `ultra-fast-${Date.now()}-${Math.random()}`,
          text: result.text,
          timestamp: new Date(),
          format: 'QR_CODE',
          source: 'camera',
        };

        // Update scanned count
        setScannedCount(prev => {
          const newCount = prev + 1;
          if (newCount <= maxCodes) {
            setLastScannedCode(result.text);
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 2000);
            
            if (newCount === maxCodes) {
              setTimeout(() => stopCamera(), 1000);
            }
          }
          return newCount;
        });

        // Pass results to parent
        if (onSingleResult) {
          onSingleResult(scanResult);
        }
        if (onResults) {
          onResults([scanResult]);
        }

        console.log(`⚡ QR Code detected (${result.region}): ${result.text.substring(0, 30)}...`);
      }
    }
  }, [onResults, onSingleResult, maxCodes]);

  // Ultra-fast frame processing with 60 FPS
  const processFrame = useCallback(() => {
    if (!isScanningRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    const now = Date.now();
    frameCountRef.current++;

    // Update FPS every second
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(Math.round(frameCountRef.current * 1000 / (now - lastFpsTimeRef.current)));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    // Process every 16ms (60 FPS) with intelligent skipping
    if (now - lastScanTimeRef.current > 16 && !processingQueueRef.current) {
      const startTime = performance.now();
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d', { 
        willReadFrequently: true,
        alpha: false,
        desynchronized: true
      });
      
      if (!ctx) return;

      // GPU-accelerated drawing
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Send to worker for parallel processing
      if (workerRef.current && !processingQueueRef.current) {
        processingQueueRef.current = true;
        const frameId = `frame_${now}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`📤 Sending frame ${frameId} to worker: ${canvas.width}x${canvas.height}`);
        
        try {
          workerRef.current.postMessage({
            type: 'PROCESS_FRAME',
            data: {
              imageData: imageData.data,
              width: canvas.width,
              height: canvas.height,
              frameId: frameId
            }
          });
        } catch (error) {
          console.error('❌ Error sending frame to worker:', error);
          processingQueueRef.current = false;
        }
      } else {
        console.log(`⏳ Worker busy or not ready, skipping frame`);
      }

      const endTime = performance.now();
      setProcessingTime(Math.round(endTime - startTime));
      
      lastScanTimeRef.current = now;
    }

    animationFrameIdRef.current = requestAnimationFrame(processFrame);
  }, []);

  // Start scanning
  const startScanning = useCallback(async () => {
    console.log('🚀 Starting Ultra-Fast Optimized Scanner...');
    setError(null);
    setScannedCount(0);
    detectedCodesRef.current.clear();
    processingQueueRef.current = false;
    
    // Go full-screen
    if (videoRef.current) {
      try {
        await videoRef.current.requestFullscreen();
        setIsFullScreen(true);
      } catch {
        console.log('Full-screen not supported, continuing with normal mode');
      }
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser.');
        return;
      }

      console.log('📹 Requesting camera permissions...');
      
      // iOS permission check
      if (platformInfo.isIOS) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          testStream.getTracks().forEach((track) => track.stop());
          console.log('✅ iOS camera permission granted');
        } catch {
          setError('Camera permission denied. Please allow camera access in Safari Settings > Privacy & Security > Camera.');
          return;
        }
      }

      console.log('🎥 Getting camera stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: getVideoConstraints(),
      });

      console.log('✅ Camera stream obtained:', stream);
      streamRef.current = stream;

      if (videoRef.current) {
        console.log('🎬 Setting video srcObject...');
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('🎯 Video metadata loaded, starting scan');
          setIsScanning(true);
          isScanningRef.current = true;
          
          setTimeout(() => {
            console.log('⚡ Starting 60 FPS ultra-fast processing...');
            processFrame();
          }, 100);
        };

        // iOS fallback
        if (platformInfo.isIOS) {
          videoRef.current.oncanplay = () => {
            console.log('🎯 Video can play, starting scan (iOS)');
            setIsScanning(true);
            isScanningRef.current = true;
            
            setTimeout(() => {
              console.log('⚡ Starting 60 FPS ultra-fast processing (iOS)...');
              processFrame();
            }, 100);
          };
        }
      } else {
        console.error('❌ Video ref is null!');
        setError('Video element not found. Please refresh the page.');
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      setError(`Camera error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [processFrame, getVideoConstraints, platformInfo.isIOS]);

  // Stop scanning
  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping Ultra-Fast Scanner...');
    setIsScanning(false);
    isScanningRef.current = false;
    processingQueueRef.current = false;
    
    // Exit full-screen
    if (isFullScreen && document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullScreen(false);
    }

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log('🛑 Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    console.log('✅ Scanner stopped');
  }, [isFullScreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
          <h2 className="text-xl font-bold text-center">⚡ Ultra-Fast Optimized Scanner</h2>
          <p className="text-sm text-center opacity-90">60 FPS • Multi-Region • GPU Accelerated</p>
        </div>

        {/* Camera View */}
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 object-cover bg-gray-900"
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
          
          {/* Scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>⚡ 60 FPS Processing...</span>
                </div>
              </div>
            </div>
          )}

          {/* Performance stats overlay */}
          {isScanning && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
              <div>FPS: {fps}</div>
              <div>Process: {processingTime}ms</div>
              <div>Scanned: {scannedCount}/{maxCodes}</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-2">
            {!isScanning ? (
              <button
                onClick={startScanning}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded transition-all transform hover:scale-105"
              >
                ⚡ Start 60 FPS Scanner
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                🛑 Stop Scanner
              </button>
            )}
          </div>

          {/* Progress indicator */}
          {scannedCount > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded p-3">
              <div className="flex justify-between text-sm font-medium text-purple-900">
                <span>⚡ Scanned:</span>
                <span>{scannedCount}/{maxCodes}</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(scannedCount / maxCodes) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-300 text-purple-800 rounded">
          <p className="text-sm font-semibold">
            🚀 Ultra-Fast Technology: 60 FPS + Multi-Region + GPU
          </p>
          <p className="text-xs mt-1">
            • 60 FPS frame processing (16ms intervals)
          </p>
          <p className="text-xs">
            • Multi-region parallel scanning (6 regions)
          </p>
          <p className="text-xs">
            • GPU-accelerated image processing
          </p>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Popup for scanned codes */}
        {showPopup && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg animate-pulse z-[9999]">
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-bold">Ultra-Fast QR Detected!</div>
              <div className="text-sm mt-1 opacity-90">
                {lastScannedCode.length > 30
                  ? lastScannedCode.substring(0, 30) + "..."
                  : lastScannedCode}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UltraFastOptimizedScanner; 