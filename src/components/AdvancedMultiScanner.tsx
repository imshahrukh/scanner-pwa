import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Zap, Play, Pause, RotateCcw, Download } from 'lucide-react';
import type { ScanResult, CameraState, ProcessingStats } from '../types';
import { BrowserMultiFormatReader } from '@zxing/library';

interface AdvancedMultiScannerProps {
  onResults: (results: ScanResult[]) => void;
  onSingleResult: (result: ScanResult) => void;
  onStatsUpdate: (stats: ProcessingStats) => void;
}

const AdvancedMultiScanner: React.FC<AdvancedMultiScannerProps> = ({
  onResults,
  onSingleResult,
  onStatsUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const lastDetectedCodesRef = useRef<Set<string>>(new Set());

  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isInitializing: false,
    hasPermission: false,
    error: null,
    stream: null
  });

  const [stats, setStats] = useState<ProcessingStats>({
    framesProcessed: 0,
    codesDetected: 0,
    averageProcessingTime: 0,
    fps: 0,
    lastUpdate: new Date()
  });

  const [detectedCodes, setDetectedCodes] = useState<ScanResult[]>([]);

  // Initialize ZXing reader
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    console.log('Initializing camera...');
    setCameraState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      };

      console.log('Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', stream);
      
      setCameraState(prev => ({
        ...prev,
        isActive: true,
        isInitializing: false,
        hasPermission: true,
        error: null,
        stream
      }));
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          videoRef.current?.play().then(() => {
            console.log('Video started playing');
          }).catch(err => {
            console.error('Error playing video:', err);
          });
        };
      }

    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraState(prev => ({
        ...prev,
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Camera access denied'
      }));
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop());
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (readerRef.current) {
      readerRef.current.reset();
    }

    setCameraState({
      isActive: false,
      isInitializing: false,
      hasPermission: false,
      error: null,
      stream: null
    });

    setDetectedCodes([]);
    lastDetectedCodesRef.current.clear();
    lastDetectionTimeRef.current = 0;
    setStats({
      framesProcessed: 0,
      codesDetected: 0,
      averageProcessingTime: 0,
      fps: 0,
      lastUpdate: new Date()
    });
  }, [cameraState.stream]);

  // Process frame for QR codes using ZXing
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || processingRef.current || !readerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions not ready yet, skipping frame processing');
      processingRef.current = false;
      return;
    }

    // Check if video is actually playing
    if (video.paused || video.ended) {
      console.log('Video not playing, skipping frame processing');
      processingRef.current = false;
      return;
    }

    // Debounce detection - only process every 500ms
    const now = Date.now();
    if (now - lastDetectionTimeRef.current < 500) {
      processingRef.current = false;
      return;
    }

    console.log('Processing frame...');
    processingRef.current = true;
    const startTime = performance.now();

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Create an image from the canvas
      const image = new Image();
      image.src = canvas.toDataURL();
      
      // Wait for image to load
      await new Promise((resolve) => {
        image.onload = resolve;
      });

      // Use ZXing to detect QR codes
      const result = await readerRef.current.decodeFromImage(image);
      
      if (result) {
        const codeText = result.getText();
        console.log('QR code detected:', codeText.substring(0, 30) + '...');
        
        // Check if this code was already detected in this frame
        if (lastDetectedCodesRef.current.has(codeText)) {
          console.log('Code already detected in this frame, skipping:', codeText.substring(0, 20));
          return;
        }
        
        // Check if this is a completely new code (not in detectedCodes)
        const isNewCode = !detectedCodes.some(existing => existing.text === codeText);
        
        if (isNewCode) {
          const scanResult: ScanResult = {
            id: `${Date.now()}-${Math.random()}`,
            text: codeText,
            format: 'QR_CODE',
            timestamp: new Date(),
            confidence: 1.0,
            boundingBox: {
              x: result.getResultPoints()?.[0]?.getX() || 0,
              y: result.getResultPoints()?.[0]?.getY() || 0,
              width: 100, // Default width
              height: 100  // Default height
            },
            source: 'camera',
            isDuplicate: false
          };
          
          setDetectedCodes(prev => [...prev, scanResult]);
          onResults([scanResult]);
          onSingleResult(scanResult);
          console.log('New QR code added:', codeText.substring(0, 30) + '...');
          
          // Update last detection time
          lastDetectionTimeRef.current = now;
        }
        
        // Add to current frame detected codes
        lastDetectedCodesRef.current.add(codeText);
      }

      // Update stats
      const processingTime = performance.now() - startTime;
      setStats(prev => {
        const newFramesProcessed = prev.framesProcessed + 1;
        const newAverageTime = (prev.averageProcessingTime * prev.framesProcessed + processingTime) / newFramesProcessed;
        
        return {
          framesProcessed: newFramesProcessed,
          codesDetected: detectedCodes.length,
          averageProcessingTime: newAverageTime,
          fps: 1000 / (processingTime + 200), // 5 FPS target
          lastUpdate: new Date()
        };
      });

      onStatsUpdate(stats);

    } catch {
      console.log('No QR codes detected in this frame');
    } finally {
      processingRef.current = false;
    }
  }, [detectedCodes, onResults, onSingleResult, onStatsUpdate, stats]);

  // Start processing loop
  const startProcessing = useCallback(() => {
    if (!cameraState.isActive) return;

    console.log('Starting processing loop');
    
    const processLoop = () => {
      if (cameraState.isActive && !processingRef.current) {
        processFrame();
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        setTimeout(processLoop, 300); // 3 FPS for better accuracy
      });
    };

    processLoop();
  }, [cameraState.isActive, processFrame]);

  // Toggle camera
  const toggleCamera = () => {
    if (cameraState.isActive) {
      stopCamera();
    } else {
      initializeCamera();
    }
  };

  // Clear detected codes
  const clearResults = () => {
    setDetectedCodes([]);
    lastDetectedCodesRef.current.clear();
    lastDetectionTimeRef.current = 0;
  };

  // Export results
  const exportResults = () => {
    const data = detectedCodes.map(code => ({
      text: code.text,
      timestamp: code.timestamp.toISOString(),
      confidence: code.confidence
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-scan-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Check browser support on mount
    console.log('Checking browser support...');
    console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('getUserMedia support:', !!navigator.mediaDevices?.getUserMedia);
    console.log('HTTPS:', window.location.protocol === 'https:');
    
    return () => {
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Debug camera state changes
  useEffect(() => {
    console.log('Camera state changed:', cameraState);
    
    // Start processing when camera becomes active
    if (cameraState.isActive && cameraState.stream) {
      console.log('Camera is active, starting processing...');
      startProcessing();
    }
  }, [cameraState, startProcessing]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Debug: Component is rendering */}
      <div className="absolute top-0 left-0 bg-red-500 text-white p-1 text-xs z-50">
        Component Rendered
      </div>
      
      {/* Camera View */}
      <div className="relative min-h-64">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover"
          autoPlay
          playsInline
          muted
          onError={(e) => console.error('Video error:', e)}
          onLoadStart={() => console.log('Video load started')}
          onLoadedData={() => console.log('Video data loaded')}
          onPlay={() => {
            console.log('Video play event fired');
            if (cameraState.stream && !cameraState.isActive) {
              setCameraState(prev => ({
                ...prev,
                isActive: true,
                hasPermission: true
              }));
            }
          }}
          style={{ backgroundColor: 'black' }}
        />
        
        {/* Camera placeholder when not active */}
        {(!cameraState.isActive || !cameraState.stream) && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium">Camera Off</p>
              <p className="text-sm text-gray-400 mt-1">Click the play button to start scanning</p>
              <div className="mt-2 text-xs text-gray-500">
                Debug: isActive={cameraState.isActive.toString()}, hasStream={!!cameraState.stream}
              </div>
            </div>
          </div>
        )}
        
        {/* Overlay */}
        {cameraState.isActive && cameraState.stream && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanning grid */}
            <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-4">
              <div className="absolute top-0 left-0 w-full h-full">
                {/* Corner guides */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-blue-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-blue-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-blue-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-blue-400"></div>
              </div>
            </div>
            
            {/* Detected codes overlay */}
            <AnimatePresence>
              {detectedCodes.map((code) => (
                <motion.div
                  key={code.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bg-green-500/80 text-white text-xs px-2 py-1 rounded"
                  style={{
                    left: `${code.boundingBox?.x || 0}px`,
                    top: `${code.boundingBox?.y || 0}px`
                  }}
                >
                  ✓ {code.text.substring(0, 20)}...
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleCamera}
              className={`p-3 rounded-full ${
                cameraState.isActive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white transition-colors`}
            >
              {cameraState.isActive ? <Pause size={20} /> : <Play size={20} />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={clearResults}
              className="p-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            >
              <RotateCcw size={20} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={exportResults}
              className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <Download size={20} />
            </motion.button>
          </div>

          <div className="flex items-center gap-2 text-white text-sm">
            <div className="flex items-center gap-1">
              <Zap size={16} />
              <span>{Math.round(stats.fps)} FPS</span>
            </div>
            <div className="flex items-center gap-1">
              <Scan size={16} />
              <span>{detectedCodes.length} codes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMultiScanner; 