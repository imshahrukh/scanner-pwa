import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Zap, Play, Pause, RotateCcw, Download } from 'lucide-react';
import type { ScanResult, CameraState, ProcessingStats } from '../types';
import jsQR from 'jsqr';

interface AdvancedMultiScannerProps {
  onResults: (results: ScanResult[]) => void;
  onSingleResult: (result: ScanResult) => void;
}

interface DetectedCode {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const AdvancedMultiScanner: React.FC<AdvancedMultiScannerProps> = ({
  onResults,
  onSingleResult
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const uniqueCodesSet = useRef<Set<string>>(new Set());
  const frameCountRef = useRef<number>(0);
  const shouldStopRef = useRef<boolean>(false); // Global stop flag

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
  const [currentFrameCodes, setCurrentFrameCodes] = useState<DetectedCode[]>([]);

  // Initialize camera with optimal settings
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
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
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

    setCameraState({
      isActive: false,
      isInitializing: false,
      hasPermission: false,
      error: null,
      stream: null
    });

    setDetectedCodes([]);
    setCurrentFrameCodes([]);
    uniqueCodesSet.current.clear();
    frameCountRef.current = 0;
    setStats({
      framesProcessed: 0,
      codesDetected: 0,
      averageProcessingTime: 0,
      fps: 0,
      lastUpdate: new Date()
    });
  }, [cameraState.stream]);

  // Enhanced multi-region QR detection
  const detectQRCodes = useCallback((imageData: ImageData): DetectedCode[] => {
    const results: DetectedCode[] = [];
    const newCodes = new Set<string>();
    
    try {
      console.log('Starting multi-region QR detection on image:', imageData.width, 'x', imageData.height);
      
      // Strategy 1: Full frame scan
      try {
        const result = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth" as const,
        });
        if (result && !uniqueCodesSet.current.has(result.data)) {
          console.log('Found QR code in full frame:', result.data.substring(0, 30) + '...');
          results.push({
            text: result.data,
            confidence: 1.0,
            boundingBox: {
              x: result.location.topLeftCorner.x,
              y: result.location.topLeftCorner.y,
              width: Math.abs(result.location.topRightCorner.x - result.location.topLeftCorner.x),
              height: Math.abs(result.location.bottomLeftCorner.y - result.location.topLeftCorner.y)
            }
          });
          newCodes.add(result.data);
        }
      } catch (error) {
        console.log('Full frame scan error:', error);
      }
      
      // Strategy 2: Top half scan (for vertically stacked QR codes)
      try {
        const topHalfCanvas = document.createElement('canvas');
        const topHalfCtx = topHalfCanvas.getContext('2d');
        if (topHalfCtx) {
          topHalfCanvas.width = imageData.width;
          topHalfCanvas.height = Math.floor(imageData.height / 2);
          
          // Create top half image data
          const topHalfImageData = new ImageData(
            new Uint8ClampedArray(imageData.data.slice(0, imageData.width * Math.floor(imageData.height / 2) * 4)),
            imageData.width,
            Math.floor(imageData.height / 2)
          );
          
          const result = jsQR(topHalfImageData.data, topHalfImageData.width, topHalfImageData.height, {
            inversionAttempts: "attemptBoth" as const,
          });
          if (result && !uniqueCodesSet.current.has(result.data) && !newCodes.has(result.data)) {
            console.log('Found QR code in top half:', result.data.substring(0, 30) + '...');
            results.push({
              text: result.data,
              confidence: 1.0,
              boundingBox: {
                x: result.location.topLeftCorner.x,
                y: result.location.topLeftCorner.y,
                width: Math.abs(result.location.topRightCorner.x - result.location.topLeftCorner.x),
                height: Math.abs(result.location.bottomLeftCorner.y - result.location.topLeftCorner.y)
              }
            });
            newCodes.add(result.data);
          }
        }
      } catch (error) {
        console.log('Top half scan error:', error);
      }
      
      // Strategy 3: Bottom half scan
      try {
        const bottomHalfCanvas = document.createElement('canvas');
        const bottomHalfCtx = bottomHalfCanvas.getContext('2d');
        if (bottomHalfCtx) {
          bottomHalfCanvas.width = imageData.width;
          bottomHalfCanvas.height = Math.floor(imageData.height / 2);
          
          // Create bottom half image data
          const startIndex = imageData.width * Math.floor(imageData.height / 2) * 4;
          const bottomHalfImageData = new ImageData(
            new Uint8ClampedArray(imageData.data.slice(startIndex)),
            imageData.width,
            Math.floor(imageData.height / 2)
          );
          
          const result = jsQR(bottomHalfImageData.data, bottomHalfImageData.width, bottomHalfImageData.height, {
            inversionAttempts: "attemptBoth" as const,
          });
          if (result && !uniqueCodesSet.current.has(result.data) && !newCodes.has(result.data)) {
            console.log('Found QR code in bottom half:', result.data.substring(0, 30) + '...');
            results.push({
              text: result.data,
              confidence: 1.0,
              boundingBox: {
                x: result.location.topLeftCorner.x,
                y: result.location.topLeftCorner.y + Math.floor(imageData.height / 2),
                width: Math.abs(result.location.topRightCorner.x - result.location.topLeftCorner.x),
                height: Math.abs(result.location.bottomLeftCorner.y - result.location.topLeftCorner.y)
              }
            });
            newCodes.add(result.data);
          }
        }
      } catch (error) {
        console.log('Bottom half scan error:', error);
      }
      
      // Strategy 4: Left half scan
      try {
        const leftHalfCanvas = document.createElement('canvas');
        const leftHalfCtx = leftHalfCanvas.getContext('2d');
        if (leftHalfCtx) {
          leftHalfCanvas.width = Math.floor(imageData.width / 2);
          leftHalfCanvas.height = imageData.height;
          
          // Create left half image data
          const leftHalfData = new Uint8ClampedArray(Math.floor(imageData.width / 2) * imageData.height * 4);
          for (let y = 0; y < imageData.height; y++) {
            for (let x = 0; x < Math.floor(imageData.width / 2); x++) {
              const srcIndex = (y * imageData.width + x) * 4;
              const dstIndex = (y * Math.floor(imageData.width / 2) + x) * 4;
              leftHalfData[dstIndex] = imageData.data[srcIndex];
              leftHalfData[dstIndex + 1] = imageData.data[srcIndex + 1];
              leftHalfData[dstIndex + 2] = imageData.data[srcIndex + 2];
              leftHalfData[dstIndex + 3] = imageData.data[srcIndex + 3];
            }
          }
          
          const leftHalfImageData = new ImageData(leftHalfData, Math.floor(imageData.width / 2), imageData.height);
          const result = jsQR(leftHalfImageData.data, leftHalfImageData.width, leftHalfImageData.height, {
            inversionAttempts: "attemptBoth" as const,
          });
          if (result && !uniqueCodesSet.current.has(result.data) && !newCodes.has(result.data)) {
            console.log('Found QR code in left half:', result.data.substring(0, 30) + '...');
            results.push({
              text: result.data,
              confidence: 1.0,
              boundingBox: {
                x: result.location.topLeftCorner.x,
                y: result.location.topLeftCorner.y,
                width: Math.abs(result.location.topRightCorner.x - result.location.topLeftCorner.x),
                height: Math.abs(result.location.bottomLeftCorner.y - result.location.topLeftCorner.y)
              }
            });
            newCodes.add(result.data);
          }
        }
      } catch (error) {
        console.log('Left half scan error:', error);
      }
      
      // Strategy 5: Right half scan
      try {
        const rightHalfCanvas = document.createElement('canvas');
        const rightHalfCtx = rightHalfCanvas.getContext('2d');
        if (rightHalfCtx) {
          rightHalfCanvas.width = Math.floor(imageData.width / 2);
          rightHalfCanvas.height = imageData.height;
          
          // Create right half image data
          const rightHalfData = new Uint8ClampedArray(Math.floor(imageData.width / 2) * imageData.height * 4);
          for (let y = 0; y < imageData.height; y++) {
            for (let x = 0; x < Math.floor(imageData.width / 2); x++) {
              const srcIndex = (y * imageData.width + (x + Math.floor(imageData.width / 2))) * 4;
              const dstIndex = (y * Math.floor(imageData.width / 2) + x) * 4;
              rightHalfData[dstIndex] = imageData.data[srcIndex];
              rightHalfData[dstIndex + 1] = imageData.data[srcIndex + 1];
              rightHalfData[dstIndex + 2] = imageData.data[srcIndex + 2];
              rightHalfData[dstIndex + 3] = imageData.data[srcIndex + 3];
            }
          }
          
          const rightHalfImageData = new ImageData(rightHalfData, Math.floor(imageData.width / 2), imageData.height);
          const result = jsQR(rightHalfImageData.data, rightHalfImageData.width, rightHalfImageData.height, {
            inversionAttempts: "attemptBoth" as const,
          });
          if (result && !uniqueCodesSet.current.has(result.data) && !newCodes.has(result.data)) {
            console.log('Found QR code in right half:', result.data.substring(0, 30) + '...');
            results.push({
              text: result.data,
              confidence: 1.0,
              boundingBox: {
                x: result.location.topLeftCorner.x + Math.floor(imageData.width / 2),
                y: result.location.topLeftCorner.y,
                width: Math.abs(result.location.topRightCorner.x - result.location.topLeftCorner.x),
                height: Math.abs(result.location.bottomLeftCorner.y - result.location.topLeftCorner.y)
              }
            });
            newCodes.add(result.data);
          }
        }
      } catch (error) {
        console.log('Right half scan error:', error);
      }
      
      if (results.length > 0) {
        console.log(`Multi-region detection found ${results.length} QR code(s) simultaneously`);
      } else {
        console.log('No QR codes found in any region');
      }
      
    } catch (error) {
      console.log('Multi-region QR detection error:', error);
    }
    
    return results;
  }, []);

  // Process frame for QR codes
  const processFrame = useCallback(async () => {
    // CRITICAL: Check global stop flag first
    if (shouldStopRef.current) {
      console.log('GLOBAL STOP FLAG - STOPPING ALL PROCESSING');
      processingRef.current = false;
      return;
    }

    // CRITICAL: Stop immediately if camera is not active
    if (!cameraState.isActive) {
      console.log('CAMERA INACTIVE - STOPPING ALL PROCESSING');
      shouldStopRef.current = true;
      processingRef.current = false;
      return;
    }

    if (!videoRef.current || !canvasRef.current || processingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      processingRef.current = false;
      return;
    }

    // Check if video is actually playing
    if (video.paused || video.ended) {
      processingRef.current = false;
      return;
    }

    // Process every 2nd frame for faster detection (15 FPS effective)
    frameCountRef.current++;
    if (frameCountRef.current % 2 !== 0) {
      processingRef.current = false;
      return;
    }

    processingRef.current = true;
    const startTime = performance.now();

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Detect QR codes
      const frameCodes = detectQRCodes(imageData);
      
      if (frameCodes.length > 0) {
        console.log(`Detected ${frameCodes.length} QR codes in frame`);
        
        // Check for truly new codes using Set
        const newCodes: DetectedCode[] = [];
        for (const code of frameCodes) {
          if (!uniqueCodesSet.current.has(code.text)) {
            uniqueCodesSet.current.add(code.text);
            newCodes.push(code);
            console.log('NEW CODE DETECTED:', code.text.substring(0, 30) + '...');
          }
        }

        if (newCodes.length > 0) {
          const newResults: ScanResult[] = newCodes.map((code, index) => ({
            id: `${Date.now()}-${index}`,
            text: code.text,
            format: 'QR_CODE',
            timestamp: new Date(),
            confidence: code.confidence,
            boundingBox: code.boundingBox,
            source: 'camera',
            isDuplicate: false
          }));

          setDetectedCodes(prev => [...prev, ...newResults]);
          onResults(newResults);
          newResults.forEach(result => onSingleResult(result));
          
          console.log(`Added ${newCodes.length} new QR codes to results`);
          
          // Auto-stop when we have detected codes
          if (uniqueCodesSet.current.size >= 2) {
            console.log('Detected 2 codes, auto-stopping camera');
            shouldStopRef.current = true;
            stopCamera();
            return; // Exit immediately after stopping
          }
        }

        setCurrentFrameCodes(frameCodes);
      }

      // Update stats only if camera is still active
      if (cameraState.isActive && !shouldStopRef.current) {
        const processingTime = performance.now() - startTime;
        setStats(prev => {
          const newFramesProcessed = prev.framesProcessed + 1;
          const newAverageTime = (prev.averageProcessingTime * prev.framesProcessed + processingTime) / newFramesProcessed;
          
          return {
            framesProcessed: newFramesProcessed,
            codesDetected: frameCodes.length,
            averageProcessingTime: newAverageTime,
            fps: 1000 / (processingTime + 66), // 15 FPS target
            lastUpdate: new Date()
          };
        });
      }

    } catch (error) {
      console.log('Frame processing error:', error);
    } finally {
      processingRef.current = false;
    }
  }, [detectQRCodes, onResults, onSingleResult, stopCamera, cameraState.isActive]);

  // Start processing loop - ONLY when camera is active
  const startProcessing = useCallback(() => {
    if (!cameraState.isActive) {
      console.log('CAMERA NOT ACTIVE - NOT STARTING PROCESSING');
      return;
    }

    console.log('Starting QR processing loop');
    shouldStopRef.current = false; // Reset stop flag
    
    const processLoop = () => {
      // CRITICAL: Check global stop flag first
      if (shouldStopRef.current) {
        console.log('GLOBAL STOP FLAG - STOPPING PROCESSING LOOP');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
        processingRef.current = false;
        return;
      }

      // CRITICAL: Check camera state before processing
      if (!cameraState.isActive) {
        console.log('CAMERA BECAME INACTIVE - STOPPING PROCESSING LOOP');
        shouldStopRef.current = true;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
        processingRef.current = false;
        return;
      }

      // Only process if camera is active and not already processing
      if (cameraState.isActive && !processingRef.current && !shouldStopRef.current) {
        processFrame();
      }
      
      // Only continue loop if camera is still active and not stopped
      if (cameraState.isActive && !shouldStopRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          setTimeout(processLoop, 66); // 15 FPS
        });
      } else {
        console.log('CAMERA INACTIVE OR STOPPED - STOPPING LOOP');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
      }
    };

    processLoop();
  }, [cameraState.isActive, processFrame]);

  // IMMEDIATE cleanup when camera becomes inactive
  useEffect(() => {
    if (!cameraState.isActive) {
      console.log('CAMERA INACTIVE - IMMEDIATE CLEANUP');
      shouldStopRef.current = true; // Set global stop flag
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      processingRef.current = false;
      setCurrentFrameCodes([]);
      setStats({
        framesProcessed: 0,
        codesDetected: 0,
        averageProcessingTime: 0,
        fps: 0,
        lastUpdate: new Date()
      });
    }
  }, [cameraState.isActive]);

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
    setCurrentFrameCodes([]);
    uniqueCodesSet.current.clear();
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
    
    // Test jsQR library
    try {
      console.log('Testing jsQR library...');
      const testImageData = new ImageData(100, 100);
      const testResult = jsQR(testImageData.data, testImageData.width, testImageData.height);
      console.log('jsQR library test result:', testResult ? 'Working' : 'No QR found (expected)');
    } catch (error) {
      console.error('jsQR library test failed:', error);
    }
    
    return () => {
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Debug camera state changes
  useEffect(() => {
    console.log('Camera state changed:', cameraState);
    
    // Start processing when camera becomes active
    if (cameraState.isActive && cameraState.stream) {
      console.log('Camera is active, starting simple QR processing...');
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium">Camera Off</p>
              <p className="text-sm text-gray-400 mt-1">Click the play button to start scanning</p>
              <div className="mt-2 text-xs text-gray-500">
                Debug: isActive={cameraState.isActive.toString()}, hasStream={!!cameraState.stream}
              </div>
              {!cameraState.isActive && (
                <div className="mt-2 text-xs text-yellow-400">
                  Processing stopped - Camera inactive
                </div>
              )}
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
              {currentFrameCodes.map((code, index) => (
                <motion.div
                  key={`${code.text}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bg-green-500/80 text-white text-xs px-2 py-1 rounded"
                  style={{
                    left: `${code.boundingBox.x}px`,
                    top: `${code.boundingBox.y}px`
                  }}
                >
                  ✓ {code.text.substring(0, 20)}...
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Auto-stop indicator */}
            {uniqueCodesSet.current.size >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-4 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg"
              >
                ✓ CODES DETECTED - CAMERA STOPPED
              </motion.div>
            )}
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