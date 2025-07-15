import { useState, useEffect } from 'react';
import Scanner from './components/Scanner';
import ResultDisplay from './components/ResultDisplay';
import InstallPrompt from './components/InstallPrompt';
import type { ScanResult } from './types';

function App() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="space-y-6">
            <Scanner onResult={handleScanResult} />
            
            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">How to use:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Click "Start Scanning" to activate your camera</li>
                <li>Point your camera at any QR code or barcode</li>
                <li>The result will appear automatically</li>
                <li>Works offline once installed as PWA</li>
              </ul>
            </div>
          </div>

          {/* Results Section */}
          <div>
            <ResultDisplay results={scanResults} onClear={handleClearResults} />
          </div>
        </div>
      </main>

      {/* Install Prompt */}
      <InstallPrompt />

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>QR & Barcode Scanner PWA - Works offline • Built with React & TypeScript</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
