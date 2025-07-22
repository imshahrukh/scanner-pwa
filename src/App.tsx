import { useState, useEffect } from 'react';
import LazyScanner from './components/LazyScanner';
import BatchScanner from './components/BatchScanner';
import BatchAnalytics from './components/BatchAnalytics';
import MultiCodeScanner from './components/MultiCodeScanner';
import TrueMultiCodeScanner from './components/TrueMultiCodeScanner';
import ResultDisplay from './components/ResultDisplay';
import InstallPrompt from './components/InstallPrompt';
import type { ScanResult } from './types';

type ScanMode = 'single' | 'batch' | 'multi' | 'true-multi';

function App() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [scanMode, setScanMode] = useState<ScanMode>('single');
  const [batchSessionResults, setBatchSessionResults] = useState<ScanResult[]>([]);
  const [batchStartTime, setBatchStartTime] = useState<number | undefined>();
  const [isBatchScanning, setIsBatchScanning] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load saved results from localStorage
    const savedResults = localStorage.getItem('scanResults');
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults) as Array<Omit<ScanResult, 'timestamp'> & { timestamp: string }>;
        const results: ScanResult[] = parsed.map((result) => ({
          ...result,
          timestamp: new Date(result.timestamp),
        }));
        setScanResults(results);
      } catch (error) {
        console.error('Failed to load saved results:', error);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Save results to localStorage whenever they change
    localStorage.setItem('scanResults', JSON.stringify(scanResults));
  }, [scanResults]);

  const handleScanResult = (result: ScanResult) => {
    setScanResults(prev => [result, ...prev.slice(0, 49)]); // Keep last 50 results
  };

  const handleClearResults = () => {
    setScanResults([]);
  };

  const handleBatchComplete = (batchResults: ScanResult[]) => {
    // Add all batch results to the main results
    setScanResults(prev => [...batchResults, ...prev]);
    // End batch session
    setIsBatchScanning(false);
    setBatchStartTime(undefined);
  };

  const handleMultiCodeResults = (results: ScanResult[]) => {
    // Add all multi-code results to the main results
    setScanResults(prev => [...results, ...prev]);
  };



  const handleBatchScanResult = (result: ScanResult) => {
    // Add to session results for analytics
    setBatchSessionResults(prev => [...prev, result]);
    // Also add to main results
    handleScanResult(result);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-4h-2m-4-4h4m-4 0V4m-6 7h2m0 0V8.01M6 12v-2m6 2v-2m0 2v2m0-2h2m-2 0H8m4 0v2m-6-2h2" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">QR & Barcode Scanner</h1>
                <p className="text-sm text-gray-600">Scan codes instantly with your camera</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m2.829 2.829L15 15.536" />
                  </svg>
                  Offline
                </span>
              )}
              
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                PWA Ready
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Scan Mode Toggle */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setScanMode('single')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  scanMode === 'single'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-4h-2m-4-4h4m-4 0V4m-6 7h2m0 0V8.01M6 12v-2m6 2v-2m0 2v2m0-2h2m-2 0H8m4 0v2m-6-2h2" />
                  </svg>
                  Single Scan
                </div>
              </button>
              
              <button
                onClick={() => setScanMode('batch')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  scanMode === 'batch'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Batch Scan
                </div>
              </button>

              <button
                onClick={() => setScanMode('multi')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  scanMode === 'multi'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image Upload
                </div>
              </button>

              <button
                onClick={() => setScanMode('true-multi')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  scanMode === 'true-multi'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  True Multi-Code
                </div>
              </button>
            </div>
          </div>
        </div>

        {scanMode === 'single' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single Scanner Section */}
            <div className="space-y-6">
              <LazyScanner 
                onResult={handleScanResult} 
                onMultiResults={handleMultiCodeResults}
                enableMultiScan={true}
              />
              
              {/* Instructions */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Enhanced Single Scan Mode:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Click "Start Scanning" to activate your camera</li>
                  <li>Point your camera at any QR code or barcode</li>
                  <li>Enhanced mode can detect multiple codes in the same frame</li>
                  <li>Perfect for scanning individual codes or multiple codes at once</li>
                  <li>Automatically detects and processes all visible QR codes</li>
                </ul>
              </div>
            </div>

            {/* Results Section */}
            <div>
              <ResultDisplay results={scanResults} onClear={handleClearResults} />
            </div>
          </div>
        ) : scanMode === 'batch' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Batch Scanner Section */}
              <div>
                <BatchScanner 
                  onResult={handleBatchScanResult} 
                  onBatchComplete={handleBatchComplete}
                />
              </div>
              
              {/* Instructions & Analytics */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Batch Scan Mode:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>Set target count (5-50 codes)</li>
                    <li>Configure scan delay and duplicate handling</li>
                    <li>Scanner continues automatically after each scan</li>
                    <li>Auto-stops when target is reached</li>
                    <li>Export results as CSV for bulk processing</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 rounded-lg shadow-lg p-4 border-l-4 border-blue-500">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">🚀 Batch Scanning Tips:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Organize QR codes in a grid layout</li>
                    <li>• Use good lighting for faster scanning</li>
                    <li>• Adjust scan delay if codes are too close</li>
                    <li>• Enable duplicate skipping for inventory</li>
                    <li>• Export to CSV for data processing</li>
                  </ul>
                </div>

                {/* Real-time Analytics */}
                <BatchAnalytics 
                  results={batchSessionResults}
                  isScanning={isBatchScanning}
                  startTime={batchStartTime}
                />
              </div>
            </div>
            
            {/* Full Results Display */}
            <div>
              <ResultDisplay results={scanResults} onClear={handleClearResults} />
            </div>
          </div>
        ) : scanMode === 'multi' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Multi-Code Scanner Section */}
              <div>
                <MultiCodeScanner onResults={handleMultiCodeResults} />
              </div>
              
              {/* Instructions */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Image Upload Multi-Code Mode:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>Upload an image containing multiple QR codes</li>
                    <li>All codes in the image are scanned simultaneously</li>
                    <li>Perfect for scanning multiple codes at once</li>
                    <li>Supports various image formats (JPEG, PNG, etc.)</li>
                    <li>Works best with clear, well-lit images</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 rounded-lg shadow-lg p-4 border-l-4 border-green-500">
                  <h3 className="text-sm font-medium text-green-900 mb-2">🎯 Image Upload Benefits:</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Scan all QR codes in an image at once</li>
                    <li>• No need to point camera at each code individually</li>
                    <li>• Perfect for inventory sheets or code collections</li>
                    <li>• Faster than real-time scanning for multiple codes</li>
                    <li>• Works with screenshots, photos, or scanned documents</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Full Results Display */}
            <div>
              <ResultDisplay results={scanResults} onClear={handleClearResults} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* True Multi-Code Scanner Section */}
              <div>
                <TrueMultiCodeScanner
                  onResults={handleMultiCodeResults}
                  onSingleResult={handleScanResult}
                />
              </div>
              
              {/* Instructions */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">True Multi-Code Camera Mode:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>Real-time camera scanning with true multi-code detection</li>
                    <li>Detects ALL QR codes in the camera view simultaneously</li>
                    <li>Works with any arrangement: vertical, horizontal, grid, scattered</li>
                    <li>No need to move camera between codes</li>
                    <li>Uses advanced jsQR library for superior detection</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 rounded-lg shadow-lg p-4 border-l-4 border-blue-500">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">🚀 True Multi-Code Benefits:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Detects ALL QR codes in camera view simultaneously</li>
                    <li>• Works with any arrangement: vertical, horizontal, grid</li>
                    <li>• No need to move camera between codes</li>
                    <li>• Real-time detection of multiple codes in single frame</li>
                    <li>• Much faster and more efficient than traditional scanners</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Full Results Display */}
            <div>
              <ResultDisplay results={scanResults} onClear={handleClearResults} />
            </div>
          </div>
        )}
      </main>

      {/* Install Prompt */}
      <InstallPrompt />

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>QR & Barcode Scanner PWA - Works offline • Built with React & TypeScript!</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
