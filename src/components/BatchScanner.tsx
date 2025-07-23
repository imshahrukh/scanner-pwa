import { useState, useCallback, useRef, useEffect } from 'react';
import { useZxing } from 'react-zxing';
import type { ScanResult } from '../types';
import { detectPlatform } from '../types';

interface BatchScannerProps {
  onResult: (result: ScanResult) => void;
  onBatchComplete?: (results: ScanResult[]) => void;
}

interface BatchScanSettings {
  targetCount: number;
  autoStop: boolean;
  duplicateHandling: 'allow' | 'skip' | 'warn';
  scanDelay: number; // milliseconds between scans
}

const BatchScanner: React.FC<BatchScannerProps> = ({ onResult, onBatchComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<ScanResult[]>([]);
  const [batchSettings, setBatchSettings] = useState<BatchScanSettings>({
    targetCount: 10,
    autoStop: true,
    duplicateHandling: 'skip',
    scanDelay: 500
  });
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [platformInfo] = useState(detectPlatform());
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track scanned codes to handle duplicates
  const scannedCodes = useRef<Set<string>>(new Set());

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

  const handleScanResult = useCallback((result: any) => {
    const now = Date.now();
    const scanResult: ScanResult = {
      id: `batch-${Date.now()}-${Math.random()}`,
      text: result.getText(),
      timestamp: new Date(),
      format: result.getBarcodeFormat?.()?.toString() || 'UNKNOWN',
      source: 'camera' as const,
    };

    // Check for duplicates
    if (batchSettings.duplicateHandling !== 'allow') {
      if (scannedCodes.current.has(scanResult.text)) {
        if (batchSettings.duplicateHandling === 'skip') {
          console.log('Duplicate code skipped:', scanResult.text);
          return;
        } else if (batchSettings.duplicateHandling === 'warn') {
          scanResult.text = `[DUPLICATE] ${scanResult.text}`;
        }
      }
    }

    // Add to scanned codes set
    scannedCodes.current.add(result.getText());

    // Add delay between scans to prevent rapid duplicate scanning
    if (now - lastScanTime < batchSettings.scanDelay) {
      return;
    }
    setLastScanTime(now);

    // Add to batch results
    setBatchResults(prev => [...prev, scanResult]);
    setScanCount(prev => prev + 1);
    
    // Call individual result handler
    onResult(scanResult);

    // Check if we've reached target count
    if (isBatchMode && batchSettings.autoStop && scanCount + 1 >= batchSettings.targetCount) {
      setTimeout(() => {
        stopBatchScanning();
      }, 1000); // Give a moment to show the last scan
    }

    // Visual/audio feedback for successful scan
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }, [batchSettings, scanCount, lastScanTime, isBatchMode, onResult]);

  const { ref } = useZxing({
    onDecodeResult: handleScanResult,
    onDecodeError(error) {
      console.debug('Scan decode error:', error);
    },
    constraints: {
      audio: false,
      video: getVideoConstraints(),
    },
    paused: !isScanning,
  });

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

  const startBatchScanning = useCallback(async () => {
    setError(null);
    setBatchResults([]);
    setScanCount(0);
    scannedCodes.current.clear();
    setIsBatchMode(true);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser.');
        return;
      }

      if (platformInfo.isIOS) {
        try {
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
      
      if (ref.current) {
        videoRef.current = ref.current;
        
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
      setError(`Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsScanning(false);
      setIsBatchMode(false);
    }
  }, [ref, platformInfo.isIOS]);

  const stopBatchScanning = useCallback(() => {
    setIsScanning(false);
    setIsBatchMode(false);
    
    // Call batch complete handler
    if (onBatchComplete && batchResults.length > 0) {
      onBatchComplete(batchResults);
    }
    
    setTimeout(() => {
      cleanupStream();
    }, platformInfo.isIOS ? 500 : 100);
  }, [cleanupStream, platformInfo.isIOS, onBatchComplete, batchResults]);

  const clearBatch = () => {
    setBatchResults([]);
    setScanCount(0);
    scannedCodes.current.clear();
  };

  const exportBatch = () => {
    if (batchResults.length === 0) return;
    
    const csvContent = [
      'Index,Text,Format,Timestamp',
      ...batchResults.map((result, index) => 
        `${index + 1},"${result.text.replace(/"/g, '""')}","${result.format || 'Unknown'}","${result.timestamp.toISOString()}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-scan-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  const progress = batchSettings.targetCount > 0 ? (scanCount / batchSettings.targetCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Batch Settings */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch QR Scanner</h3>
        
        {!isBatchMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Count: {batchSettings.targetCount}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={batchSettings.targetCount}
                onChange={(e) => setBatchSettings(prev => ({ ...prev, targetCount: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scan Delay: {batchSettings.scanDelay}ms
              </label>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={batchSettings.scanDelay}
                onChange={(e) => setBatchSettings(prev => ({ ...prev, scanDelay: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Fast</span>
                <span>Medium</span>
                <span>Slow</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duplicate Handling
              </label>
              <select
                value={batchSettings.duplicateHandling}
                onChange={(e) => setBatchSettings(prev => ({ ...prev, duplicateHandling: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="skip">Skip Duplicates</option>
                <option value="allow">Allow Duplicates</option>
                <option value="warn">Mark Duplicates</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={batchSettings.autoStop}
                  onChange={(e) => setBatchSettings(prev => ({ ...prev, autoStop: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Auto-stop at target</span>
              </label>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isBatchMode && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {scanCount} / {batchSettings.targetCount}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Camera Preview */}
        <div className="relative mb-4">
          {isScanning ? (
            <div className="relative">
              <video
                ref={ref}
                className="w-full aspect-video object-cover rounded-lg"
                playsInline
                muted
                autoPlay
                style={{
                  objectFit: 'cover',
                  WebkitTransform: platformInfo.isIOS ? 'translateZ(0)' : 'none',
                  WebkitBackfaceVisibility: platformInfo.isIOS ? 'hidden' : 'visible',
                }}
              />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
              </div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
                Batch Scanning: {scanCount} / {batchSettings.targetCount}
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm">Ready for batch scanning</p>
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          {!isScanning ? (
            <button
              onClick={startBatchScanning}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Start Batch Scanning
            </button>
          ) : (
            <button
              onClick={stopBatchScanning}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop Scanning
            </button>
          )}
          
          {batchResults.length > 0 && (
            <>
              <button
                onClick={exportBatch}
                className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Export CSV
              </button>
              <button
                onClick={clearBatch}
                className="px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch Results Summary */}
      {batchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            Batch Results ({batchResults.length} codes)
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {batchResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    #{index + 1}
                  </span>
                  <span className="font-mono text-gray-800 truncate max-w-xs">
                    {result.text}
                  </span>
                </div>
                <div className="text-gray-500 text-xs">
                  {result.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchScanner; 