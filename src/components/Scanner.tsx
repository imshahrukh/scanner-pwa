import { useState, useCallback } from 'react';
import { useZxing } from 'react-zxing';
import type { ScanResult } from '../types';

interface ScannerProps {
  onResult: (result: ScanResult) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onResult }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ref } = useZxing({
    onDecodeResult(result) {
      const scanResult: ScanResult = {
        text: result.getText(),
        timestamp: new Date(),
        format: result.getBarcodeFormat?.()?.toString(),
      };
      onResult(scanResult);
      setIsScanning(false);
    },
    onDecodeError(error) {
      // Silent error handling - scanning continues
      console.debug('Scan decode error:', error);
    },
    constraints: {
      audio: false,
      video: {
        facingMode: 'environment', // Use back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    paused: !isScanning,
  });

  const startScanning = useCallback(async () => {
    setError(null);
    try {
      // Check if camera permission is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser.');
        return;
      }
      setIsScanning(true);
    } catch (error) {
      setError(`Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsScanning(false);
    }
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  return (
    <div className="scanner-container">
      <div className="p-4">
        <h2 className="text-xl font-semibold text-center mb-4">QR & Barcode Scanner</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="text-sm">{error}</p>
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
              />
              <div className="absolute inset-0 border-2 border-primary-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary-500"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary-500"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary-500"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary-500"></div>
              </div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                Point camera at QR code or barcode
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start Scanning
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
              Stop Scanning
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner; 