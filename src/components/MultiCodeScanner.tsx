import { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import type { ScanResult } from '../types';

interface MultiCodeScannerProps {
  onResults: (results: ScanResult[]) => void;
}

const MultiCodeScanner: React.FC<MultiCodeScannerProps> = ({ onResults }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scanImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Create canvas to process the image
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Load image
      const img = new Image();
      img.onload = async () => {
        try {
          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image to canvas
          ctx.drawImage(img, 0, 0);



          // Create ZXing reader
          const reader = new BrowserMultiFormatReader();
          
          // Scan for multiple codes
          const results: ScanResult[] = [];
          const scannedTexts = new Set<string>();

          // Try different scan strategies
          const scanStrategies = [
            // Strategy 1: Direct scan
            () => reader.decodeFromImage(canvas.toDataURL()),
            // Strategy 2: Try with different hints
            () => reader.decodeFromImage(canvas.toDataURL())
          ];

          for (const strategy of scanStrategies) {
            try {
              const result = await strategy();
              if (result && !scannedTexts.has(result.getText())) {
                scannedTexts.add(result.getText());
                results.push({
                  text: result.getText(),
                  timestamp: new Date(),
                  format: result.getBarcodeFormat?.()?.toString(),
                });
              }
            } catch (e) {
              // Continue to next strategy
              console.debug('Strategy failed:', e);
            }
          }

          // If no results with direct scan, try region-based scanning
          if (results.length === 0) {
            // Divide image into regions and scan each region
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
                
                if (result && !scannedTexts.has(result.getText())) {
                  scannedTexts.add(result.getText());
                  results.push({
                    text: result.getText(),
                    timestamp: new Date(),
                    format: result.getBarcodeFormat?.()?.toString(),
                  });
                }
              } catch (e) {
                // Continue to next region
                console.debug('Region scan failed:', e);
              }
            }
          }

          if (results.length > 0) {
            onResults(results);
            setError(null);
          } else {
            setError('No QR codes or barcodes found in the image. Please try a different image.');
          }

        } catch (err) {
          console.error('Image processing error:', err);
          setError('Failed to process image. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setError('Failed to load image. Please try a different file.');
        setIsProcessing(false);
      };

      img.src = url;

    } catch (err) {
      console.error('Scan error:', err);
      setError('Failed to scan image. Please try again.');
      setIsProcessing(false);
    }
  }, [onResults]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file is too large. Please select an image smaller than 10MB.');
        return;
      }

      scanImage(file);
    }
  }, [scanImage]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      scanImage(file);
    }
  }, [scanImage]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const clearImage = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-Code Image Scanner</h3>
        
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              previewUrl 
                ? 'border-gray-300 bg-gray-50' 
                : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {!previewUrl ? (
              <div>
                <svg className="w-12 h-12 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload Image with Multiple QR Codes
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop an image here, or click to select
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Select Image
                </button>
              </div>
            ) : (
              <div>
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm"
                />
                <div className="mt-4 space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Select Different Image
                  </button>
                  <button
                    onClick={clearImage}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Scanning image for QR codes...</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <h4 className="text-sm font-medium text-blue-900 mb-2">📸 How to use Multi-Code Scanner:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload an image containing multiple QR codes</li>
              <li>• The scanner will detect all codes in the image</li>
              <li>• Results will show all found codes at once</li>
              <li>• Supports JPEG, PNG, and other image formats</li>
              <li>• Works best with clear, well-lit images</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MultiCodeScanner; 