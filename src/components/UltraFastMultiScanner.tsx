import { useState, useRef, useEffect, useCallback } from 'react';
import type { ScanResult } from '../types';

interface UltraFastMultiScannerProps {
  onResults: (results: ScanResult[]) => void;
  maxCodes?: number;
}

interface DetectedCode {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  timestamp: number;
}

const UltraFastMultiScanner: React.FC<UltraFastMultiScannerProps> = ({ 
  onResults, 
  maxCodes = 50 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const workerPoolRef = useRef<Worker[]>([]);
  const processingRef = useRef<boolean>(false);
  const uniqueCodesSet = useRef<Set<string>>(new Set());
  const frameCountRef = useRef<number>(0);
  
  const [isScanning, setIsScanning] = useState(false);
  const [detectedCodes, setDetectedCodes] = useState<DetectedCode[]>([]);
  const [stats, setStats] = useState({
    fps: 0,
    codesFound: 0,
    processingTime: 0,
    regionsScanned: 0
  });

  // Performance tracking
  const fpsCounterRef = useRef<number[]>([]);
  
  // Optimized code tracking with Map for O(1) lookups
  const codeMapRef = useRef<Map<string, DetectedCode>>(new Map());
  const lastUpdateTimeRef = useRef<number>(0);

  // Initialize Web Workers for parallel processing
  useEffect(() => {
    const workerCount = Math.min(navigator.hardwareConcurrency || 4, 8);
    const workers: Worker[] = [];
    
    for (let i = 0; i < workerCount; i++) {
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');
        
        self.onmessage = function(e) {
          const { imageData, width, height, regionId } = e.data;
          
          try {
            const result = jsQR(imageData, width, height, {
              inversionAttempts: "dontInvert",
            });
            
            if (result) {
              self.postMessage({
                success: true,
                regionId,
                data: result.data,
                location: result.location
              });
            } else {
              self.postMessage({
                success: false,
                regionId
              });
            }
          } catch (error) {
            self.postMessage({
              success: false,
              regionId,
              error: error.message
            });
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onmessage = (e) => {
        const { success, data, location } = e.data;
        if (success && data) {
          addDetectedCode(data, location);
        }
      };
      
      workers.push(worker);
    }
    
    workerPoolRef.current = workers;
    
    return () => {
      workers.forEach(worker => {
        worker.terminate();
      });
    };
  }, []);

  // Ultra-fast code detection with Set-based deduplication
  const addDetectedCode = useCallback((text: string, location: any) => {
    const now = performance.now();
    
    // Check if this code is already in our unique set
    if (uniqueCodesSet.current.has(text)) {
      console.log('Code already exists:', text.substring(0, 30) + '...');
      return;
    }
    
    // Add to unique set
    uniqueCodesSet.current.add(text);
    console.log('NEW CODE DETECTED:', text.substring(0, 30) + '...');
    
    const codeId = `${text}_${Math.floor(location.topLeftCorner.x)}_${Math.floor(location.topLeftCorner.y)}`;
    
    const newCode: DetectedCode = {
      id: codeId,
      text,
      x: location.topLeftCorner.x,
      y: location.topLeftCorner.y,
      width: Math.abs(location.topRightCorner.x - location.topLeftCorner.x),
      height: Math.abs(location.bottomLeftCorner.y - location.topLeftCorner.y),
      confidence: 1.0,
      timestamp: now
    };
    
    codeMapRef.current.set(text, newCode);
    
    // Update state efficiently - batch updates every 16ms (60fps)
    if (now - lastUpdateTimeRef.current > 16) {
      const codesArray = Array.from(codeMapRef.current.values()).slice(0, maxCodes);
      setDetectedCodes(codesArray);
      
      // Convert to ScanResult format for parent component
      const scanResults: ScanResult[] = codesArray.map(code => ({
        id: code.id,
        text: code.text,
        format: 'QR_CODE',
        timestamp: new Date(code.timestamp),
        confidence: code.confidence,
        source: 'camera' as const,
        boundingBox: {
          x: code.x,
          y: code.y,
          width: code.width,
          height: code.height
        }
      }));
      
      onResults(scanResults);
      lastUpdateTimeRef.current = now;
      
      // Check if we've reached max codes and stop scanning
      if (uniqueCodesSet.current.size >= maxCodes) {
        console.log(`Reached max codes (${maxCodes}), stopping scanner`);
        stopScanning();
      }
    }
  }, [maxCodes, onResults]);

  // Ultra-optimized frame processing with parallel region scanning
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || processingRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    // Process every 3rd frame for better performance (20 FPS effective)
    frameCountRef.current++;
    if (frameCountRef.current % 3 !== 0) {
      processingRef.current = false;
      return;
    }
    
    processingRef.current = true;
    const startTime = performance.now();
    
    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data once
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Calculate optimal grid size based on expected QR code density
    const gridSize = Math.min(Math.ceil(Math.sqrt(maxCodes)), 10);
    const regionWidth = Math.floor(canvas.width / gridSize);
    const regionHeight = Math.floor(canvas.height / gridSize);
    
    let regionCount = 0;
    const workers = workerPoolRef.current;
    let workerIndex = 0;
    
    // Process regions in parallel using worker pool
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * regionWidth;
        const y = row * regionHeight;
        const w = Math.min(regionWidth, canvas.width - x);
        const h = Math.min(regionHeight, canvas.height - y);
        
        // Skip tiny regions
        if (w < 50 || h < 50) continue;
        
        // Extract region data efficiently
        const regionImageData = ctx.getImageData(x, y, w, h);
        
        // Send to worker
        if (workers[workerIndex]) {
          workers[workerIndex].postMessage({
            imageData: regionImageData.data,
            width: w,
            height: h,
            regionId: `${row}_${col}`
          });
        }
        
        workerIndex = (workerIndex + 1) % workers.length;
        regionCount++;
      }
    }
    
    // Also do a full frame scan for large QR codes
    if (workers[0]) {
      workers[0].postMessage({
        imageData: imageData.data,
        width: canvas.width,
        height: canvas.height,
        regionId: 'full_frame'
      });
      regionCount++;
    }
    
    // Update performance stats
    const processingTime = performance.now() - startTime;
    const now = performance.now();
    
    // Calculate FPS
    fpsCounterRef.current.push(now);
    fpsCounterRef.current = fpsCounterRef.current.filter(time => now - time < 1000);
    
    setStats({
      fps: fpsCounterRef.current.length,
      codesFound: uniqueCodesSet.current.size,
      processingTime: Math.round(processingTime),
      regionsScanned: regionCount
    });
    
    processingRef.current = false;
  }, [maxCodes]);

  // High-frequency scanning loop optimized for performance
  const startScanning = useCallback(() => {
    if (!isScanning) return;
    
    const scanLoop = () => {
      if (isScanning && !processingRef.current) {
        processFrame();
      }
      
      // Request next frame - targeting 60fps
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    };
    
    scanLoop();
  }, [isScanning, processFrame]);

  // Camera initialization
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  // Stop scanning and cleanup
  const stopScanning = () => {
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Clear detected codes
    codeMapRef.current.clear();
    setDetectedCodes([]);
    uniqueCodesSet.current.clear();
    frameCountRef.current = 0;
  };

  // Clear all results
  const clearResults = () => {
    codeMapRef.current.clear();
    setDetectedCodes([]);
    uniqueCodesSet.current.clear();
  };

  // Start scanning when component mounts
  useEffect(() => {
    if (isScanning) {
      startScanning();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, startScanning]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Ultra-Fast Scanner Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">⚡ Ultra-Fast Multi Scanner</h2>
            <p className="text-gray-300 text-xs">50+ QR codes simultaneously • Real-time</p>
          </div>
          <div className="text-right">
            <div className="text-green-400 font-mono text-lg">{stats.fps} FPS</div>
            <div className="text-blue-400 text-xs">{uniqueCodesSet.current.size}/{maxCodes} codes</div>
          </div>
        </div>
      </div>

      {/* Camera Feed */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-80 object-cover"
          autoPlay
          playsInline
          muted
        />
        
        {/* QR Code Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {detectedCodes.map((code) => (
            <div
              key={code.id}
              className="absolute border-2 border-green-400 bg-green-400/20"
              style={{
                left: `${(code.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
                top: `${(code.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                width: `${(code.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
                height: `${(code.height / (videoRef.current?.videoHeight || 1)) * 100}%`,
              }}
            >
              <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-1 rounded truncate max-w-32">
                {code.text.substring(0, 10)}...
              </div>
            </div>
          ))}
        </div>

        {/* Scanning Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full border-2 border-blue-400/30 relative">
            {/* Grid lines for visualization */}
            {Array.from({ length: Math.ceil(Math.sqrt(maxCodes)) - 1 }).map((_, i) => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 border-l border-blue-400/20" 
                   style={{ left: `${((i + 1) / Math.ceil(Math.sqrt(maxCodes))) * 100}%` }} />
            ))}
            {Array.from({ length: Math.ceil(Math.sqrt(maxCodes)) - 1 }).map((_, i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 border-t border-blue-400/20" 
                   style={{ top: `${((i + 1) / Math.ceil(Math.sqrt(maxCodes))) * 100}%` }} />
            ))}
          </div>
        </div>

        {/* Processing indicator */}
        {processingRef.current && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
            PROCESSING
          </div>
        )}
        
        {/* Auto-stop indicator */}
        {uniqueCodesSet.current.size >= maxCodes && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
            MAX CODES REACHED - STOPPED
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={isScanning ? stopScanning : initCamera}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                isScanning 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isScanning ? '⏸ Stop' : '▶ Start'}
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
            >
              🗑 Clear
            </button>
          </div>

          <div className="text-white text-sm">
            <div className="flex gap-4">
              <span>⚡ {stats.processingTime}ms</span>
              <span>🔍 {stats.regionsScanned} regions</span>
              <span>📊 {uniqueCodesSet.current.size} found</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default UltraFastMultiScanner; 