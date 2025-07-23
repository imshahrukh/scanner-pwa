import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  Camera, 
  Settings, 
  Download, 
  Trash2, 
  Zap, 
  BarChart3, 
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import AdvancedMultiScanner from './components/AdvancedMultiScanner';
import type { ScanResult, ProcessingStats } from './types';

function App() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentStats, setCurrentStats] = useState<ProcessingStats>({
    framesProcessed: 0,
    codesDetected: 0,
    averageProcessingTime: 0,
    fps: 0,
    lastUpdate: new Date()
  });
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load saved results from localStorage
    const savedResults = localStorage.getItem('multiQRScanResults');
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

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // Save results to localStorage whenever they change
    localStorage.setItem('multiQRScanResults', JSON.stringify(scanResults));
  }, [scanResults]);

  const handleScanResults = (results: ScanResult[]) => {
    setScanResults(prev => {
      const newResults = [...results, ...prev];
      // Keep only last 100 results
      return newResults.slice(0, 100);
    });
  };

  const handleSingleResult = (result: ScanResult) => {
    setScanResults(prev => [result, ...prev.slice(0, 99)]);
  };

  const handleStatsUpdate = (stats: ProcessingStats) => {
    setCurrentStats(stats);
  };

  const handleClearResults = () => {
    setScanResults([]);
  };

  const handleExportResults = () => {
    const data = scanResults.map(result => ({
      text: result.text,
      format: result.format,
      timestamp: result.timestamp.toISOString(),
      confidence: result.confidence,
      source: result.source
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-qr-scan-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
      }
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
              >
                <QrCode className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Multi-QR Scanner
                </h1>
                <p className="text-sm text-gray-600">Advanced real-time multi-code detection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!isOnline && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium"
                >
                  <WifiOff className="w-4 h-4" />
                  Offline
                </motion.div>
              )}
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                PWA Ready
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scanner Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Scanner Title */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Advanced Multi-QR Scanner
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Scan multiple QR codes simultaneously in real-time with our cutting-edge detection technology. 
                  Perfect for inventory, batch processing, and rapid code collection.
                </p>
              </div>

              {/* Scanner Component */}
              <AdvancedMultiScanner
                onResults={handleScanResults}
                onSingleResult={handleSingleResult}
                onStatsUpdate={handleStatsUpdate}
              />

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Real-time Processing</h3>
                  <p className="text-sm text-gray-600">
                    Advanced algorithms detect multiple QR codes simultaneously with high accuracy and speed.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Camera className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Multi-Scale Detection</h3>
                  <p className="text-sm text-gray-600">
                    Detects codes of various sizes and orientations using region-based and scale-invariant scanning.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">PWA Optimized</h3>
                  <p className="text-sm text-gray-600">
                    Works offline, installable on any device, and provides native app-like experience.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Results & Stats Section */}
          <div className="space-y-6">
            {/* Live Stats */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Live Statistics</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">FPS</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {Math.round(currentStats.fps)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Frames Processed</span>
                  <span className="font-mono font-semibold text-green-600">
                    {currentStats.framesProcessed.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Codes Detected</span>
                  <span className="font-mono font-semibold text-purple-600">
                    {currentStats.codesDetected.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Processing</span>
                  <span className="font-mono font-semibold text-orange-600">
                    {currentStats.averageProcessingTime.toFixed(1)}ms
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Results Summary */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Scan Results</h3>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExportResults}
                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    title="Export Results"
                  >
                    <Download className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClearResults}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    title="Clear Results"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {scanResults.slice(0, 10).map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {result.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {result.timestamp.toLocaleTimeString()}
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {result.format}
                            </span>
                            {result.confidence && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                {Math.round(result.confidence * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {scanResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No codes scanned yet</p>
                    <p className="text-xs text-gray-400 mt-1">Start scanning to see results here</p>
                  </div>
                )}

                {scanResults.length > 10 && (
                  <div className="text-center py-2">
                    <span className="text-sm text-gray-500">
                      +{scanResults.length - 10} more results
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportResults}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm font-medium">Export Results</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClearResults}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Clear All Results</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Install Multi-QR Scanner</h4>
                  <p className="text-sm text-gray-600">Get the full app experience</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={dismissInstallPrompt}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstallApp}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Install
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">Multi-QR Scanner</span>
          </div>
          <p className="text-gray-600 text-sm">
            Advanced real-time multi-QR code detection • Built with React & TypeScript • PWA Ready
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
