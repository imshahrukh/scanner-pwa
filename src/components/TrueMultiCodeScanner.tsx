import React, { useState, useRef, useCallback, useEffect } from "react";
import jsQR from "jsqr";
import type { ScanResult } from "../types";

interface TrueMultiCodeScannerProps {
  onResults: (results: ScanResult[]) => void;
  onSingleResult?: (result: ScanResult) => void;
  maxCodes?: number; // Default to 10
}

const TrueMultiCodeScanner: React.FC<TrueMultiCodeScannerProps> = ({
  onResults,
  onSingleResult,
  maxCodes = 10,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const scannedCodesSetRef = useRef<Set<string>>(new Set());

  // Platform detection
  const platformInfo = {
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isMobile:
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
  };

  // iOS-friendly video constraints
  const getVideoConstraints = useCallback(() => {
    if (platformInfo.isIOS) {
      return {
        facingMode: "environment",
        width: { ideal: 640, max: 1024 },
        height: { ideal: 480, max: 768 },
        frameRate: { ideal: 15, max: 30 },
      };
    } else {
      return {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      };
    }
  }, [platformInfo.isIOS]);

  // ORIGINAL WORKING VERSION - EXACT copy from test file
  const detectMultipleCodes = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.log("Video or canvas not ready");
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      console.log(
        "Video dimensions not ready:",
        video.videoWidth,
        video.videoHeight
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("Canvas context not available");
      return;
    }

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const results: ScanResult[] = [];
    const newCodes = new Set<string>();

    console.log("Scanning frame:", canvas.width, "x", canvas.height);

    // Strategy 1: Scan the entire frame
    try {
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result && !scannedCodesSetRef.current.has(result.data)) {
        console.log("Found QR code in full frame:", result.data);
        results.push({
          id: `true-multi-${Date.now()}-${Math.random()}`,
          text: result.data,
          timestamp: new Date(),
          format: "QR_CODE",
          source: "camera" as const,
        });
        newCodes.add(result.data);
      }
    } catch (error) {
      console.error("Full frame scan error:", error);
    }

    // Strategy 2: Scan 3x3 grid (9 regions) for better multi-code detection
    const gridSize = 3;
    const regionWidth = Math.floor(canvas.width / gridSize);
    const regionHeight = Math.floor(canvas.height / gridSize);

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        try {
          const regionCanvas = document.createElement("canvas");
          const regionCtx = regionCanvas.getContext("2d");
          if (regionCtx) {
            regionCanvas.width = regionWidth;
            regionCanvas.height = regionHeight;

            // Extract region from main canvas
            regionCtx.drawImage(
              canvas,
              col * regionWidth,
              row * regionHeight,
              regionWidth,
              regionHeight,
              0,
              0,
              regionWidth,
              regionHeight
            );

            const regionImageData = regionCtx.getImageData(
              0,
              0,
              regionWidth,
              regionHeight
            );

            const result = jsQR(
              regionImageData.data,
              regionImageData.width,
              regionImageData.height
            );

            if (
              result &&
              !scannedCodesSetRef.current.has(result.data) &&
              !newCodes.has(result.data)
            ) {
              console.log(
                `Found QR code in region [${row},${col}]:`,
                result.data
              );
              results.push({
                id: `true-multi-grid-${row}-${col}-${Date.now()}-${Math.random()}`,
                text: result.data,
                timestamp: new Date(),
                format: "QR_CODE",
                source: "camera" as const,
              });
              newCodes.add(result.data);
            }
          }
        } catch (error) {
          console.error(`Grid region [${row},${col}] scan error:`, error);
        }
      }
    }

    // Strategy 3: Scan quadrants as backup
    const quadrants = [
      { name: "top-left", x: 0, y: 0, w: 0.5, h: 0.5 },
      { name: "top-right", x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { name: "bottom-left", x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { name: "bottom-right", x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ];

    for (const quadrant of quadrants) {
      try {
        const quadrantCanvas = document.createElement("canvas");
        const quadrantCtx = quadrantCanvas.getContext("2d");
        if (quadrantCtx) {
          quadrantCanvas.width = Math.floor(canvas.width * quadrant.w);
          quadrantCanvas.height = Math.floor(canvas.height * quadrant.h);

          quadrantCtx.drawImage(
            canvas,
            Math.floor(canvas.width * quadrant.x),
            Math.floor(canvas.height * quadrant.y),
            Math.floor(canvas.width * quadrant.w),
            Math.floor(canvas.height * quadrant.h),
            0,
            0,
            quadrantCanvas.width,
            quadrantCanvas.height
          );

          const quadrantImageData = quadrantCtx.getImageData(
            0,
            0,
            quadrantCanvas.width,
            quadrantCanvas.height
          );

          const result = jsQR(
            quadrantImageData.data,
            quadrantImageData.width,
            quadrantImageData.height
          );

          if (
            result &&
            !scannedCodesSetRef.current.has(result.data) &&
            !newCodes.has(result.data)
          ) {
            console.log(`Found QR code in ${quadrant.name}:`, result.data);
            results.push({
              id: `true-multi-${quadrant.name}-${Date.now()}-${Math.random()}`,
              text: result.data,
              timestamp: new Date(),
              format: "QR_CODE",
              source: "camera" as const,
            });
            newCodes.add(result.data);
          }
        }
      } catch (error) {
        console.error(`${quadrant.name} scan error:`, error);
      }
    }

    // Report all found codes
    if (results.length > 0) {
      console.log(
        `Detected ${results.length} QR code(s):`,
        results.map((r) => r.text)
      );

      // Add to scanned codes to prevent duplicates
      newCodes.forEach((code) => scannedCodesSetRef.current.add(code));

      // Update count and show popup for each new code
      results.forEach((result) => {
        setScannedCount((prev) => {
          const newCount = prev + 1;
          if (newCount <= maxCodes) {
            // Show popup for scanned code
            setLastScannedCode(result.text);
            setShowPopup(true);

            // Auto-hide popup after 2 seconds
            setTimeout(() => setShowPopup(false), 2000);

            // Check if we've reached the limit
            if (newCount === maxCodes) {
              console.log(`Reached ${maxCodes} codes limit, stopping camera`);
              setTimeout(() => stopCamera(), 1000); // Stop after 1 second
            }
          }
          return newCount;
        });
      });

      if (results.length > 0) {
        if (results.length === 1 && onSingleResult) {
          onSingleResult(results[0]);
        }
        if (onResults) {
          onResults(results);
        }
      }
    }
  }, [onResults, onSingleResult, maxCodes]);

  // ORIGINAL WORKING VERSION - EXACT copy from test file
  const scanFrame = useCallback(() => {
    if (!isScanningRef.current) {
      console.log("Scanning stopped, exiting scanFrame");
      return;
    }

    const now = Date.now();
    if (now - lastScanTimeRef.current > 50) {
      // Scan every 200ms for faster detection
      console.log("Running scan frame...");
      detectMultipleCodes();
      lastScanTimeRef.current = now;
    }

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [detectMultipleCodes]);

  // Start scanning
  const startScanning = useCallback(async () => {
    console.log("Starting camera...");
    setError(null);
    scannedCodesSetRef.current = new Set();
    setScannedCount(0);
    
    // Clear any existing results to start fresh
    if (onResults) {
      onResults([]); // Send empty results to clear the display
    }
    
    // Go full-screen with the video element
    if (videoRef.current) {
      try {
        await videoRef.current.requestFullscreen();
        setIsFullScreen(true);
      } catch {
        console.log("Full-screen not supported, continuing with normal mode");
      }
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera access is not supported in this browser.");
        return;
      }

      console.log("Requesting camera permissions...");
      // iOS permission check
      if (platformInfo.isIOS) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          testStream.getTracks().forEach((track) => track.stop());
          console.log("iOS camera permission granted");
        } catch {
          setError(
            "Camera permission denied. Please allow camera access in Safari Settings > Privacy & Security > Camera."
          );
          return;
        }
      }

      console.log("Getting camera stream...");
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: getVideoConstraints(),
      });

      console.log("Camera stream obtained:", stream);
      streamRef.current = stream;

      if (videoRef.current) {
        console.log("Setting video srcObject...");
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, starting scan");
          setIsScanning(true);
          isScanningRef.current = true; // Set ref immediately
          // Start scanning after a short delay to ensure video is ready
          setTimeout(() => {
            console.log("Starting scan frame loop...");
            scanFrame();
          }, 100);
        };

        // iOS fallback
        if (platformInfo.isIOS) {
          videoRef.current.oncanplay = () => {
            console.log("Video can play, starting scan (iOS)");
            setIsScanning(true);
            isScanningRef.current = true; // Set ref immediately
            setTimeout(() => {
              console.log("Starting scan frame loop (iOS)...");
              scanFrame();
            }, 100);
          };
        }
      } else {
        console.error("Video ref is null!");
        setError("Video element not found. Please refresh the page.");
      }
    } catch (error) {
      console.error("Camera error:", error);

      if (platformInfo.isIOS) {
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            setError(
              "Camera access denied. Please allow camera access and reload the page."
            );
          } else if (error.name === "NotFoundError") {
            setError("No camera found on this device.");
          } else {
            setError(`Camera error: ${error.message}`);
          }
        } else {
          setError("Unknown camera error occurred.");
        }
      } else {
        setError(
          `Camera error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  }, [scanFrame, getVideoConstraints, platformInfo.isIOS]);

  // Stop scanning
  const stopCamera = useCallback(() => {
    console.log("Stopping camera...");
    setIsScanning(false);
    isScanningRef.current = false;
    
    // Exit full-screen if active
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
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    console.log("Camera stopped");
  }, []);

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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <h2 className="text-xl font-bold text-center">10 QR Code Scanner</h2>
          <p className="text-center text-blue-100 text-sm mt-1">
            Scan up to {maxCodes} QR codes simultaneously
          </p>
        </div>

        {/* Camera container */}
        <div className="relative bg-gray-900 aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Overlay when camera is off */}
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <div className="text-center">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm">Camera ready</p>
              </div>
            </div>
          )}


          {/* Overlay when scanning */}
          {isScanning && (
            <div className="absolute inset-0 bg-black bg-opacity-20">
              <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                Scanning...
              </div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
                Multi-Code Mode: All visible QR codes will be detected
                simultaneously
                {platformInfo.isIOS && (
                  <span className="block text-xs">
                    Tap screen if scanning freezes
                  </span>
                )}
              </div>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Start Full-Screen Scanner
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Stop Scanner
              </button>
            )}
          </div>

          {/* Progress indicator */}
          {scannedCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex justify-between text-sm font-medium text-blue-900">
                <span>Scanned:</span>
                <span>
                  {scannedCount}/{maxCodes}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(scannedCount / maxCodes) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p className="text-sm">
            🚀 Advanced Multi-Code Detection: Detects ALL QR codes in the camera
            view simultaneously
          </p>
          <p className="text-xs mt-1">
            Works with any arrangement: vertical, horizontal, grid, or scattered
            QR codes
          </p>
        </div>

        {/* Tips */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h4 className="text-sm font-medium text-green-900 mb-1">
            🎯 True Multi-Code Scanner Benefits:
          </h4>
          <ul className="text-xs text-green-800 space-y-1">
            <li>• Detects ALL QR codes in the camera view simultaneously</li>
            <li>
              • Works with any arrangement: vertical, horizontal, grid,
              scattered
            </li>
            <li>• No need to move camera between codes</li>
            <li>• Real-time detection of multiple codes in a single frame</li>
            <li>• Much faster and more efficient than traditional scanners</li>
          </ul>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Popup for scanned codes */}
        {showPopup && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg animate-pulse z-50">
            <div className="text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-bold">QR Code Scanned!</div>
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

export default TrueMultiCodeScanner;
