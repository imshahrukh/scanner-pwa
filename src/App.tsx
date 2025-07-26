import { useState, useEffect, useRef } from 'react';

// PWA install prompt types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  Camera, 
  Zap, 
  Smartphone,
  WifiOff,
  CheckCircle
} from 'lucide-react';
import TrueMultiCodeScanner from './components/TrueMultiCodeScanner';
import UltraFastResultsDisplay from './components/UltraFastResultsDisplay';
import UltraFastDemoSetup from './components/UltraFastDemoSetup';
import type { ScanResult } from './types';

function App() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const uniqueCodesSet = useRef<Set<string>>(new Set());

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
        // Add existing codes to unique set
        results.forEach(result => uniqueCodesSet.current.add(result.text));
      } catch (error) {
        console.error('Failed to load saved results:', error);
      }
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
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
    console.log('Received results:', results.length, 'codes');
    
    // Force immediate state update for mobile compatibility
    setScanResults(prev => {
      // Filter out duplicates within this session only
      const newUniqueResults = results.filter(result => {
        // Check if this code was already added in this session
        const isDuplicate = prev.some(existing => existing.text === result.text);
        if (isDuplicate) {
          console.log('Session duplicate filtered out:', result.text.substring(0, 30) + '...');
          return false;
        } else {
          console.log('New unique code added:', result.text.substring(0, 30) + '...');
          return true;
        }
      });

      if (newUniqueResults.length > 0) {
        const updatedResults = [...newUniqueResults, ...prev];
        // Keep only last 100 results
        const finalResults = updatedResults.slice(0, 100);
        
        // Force localStorage update for mobile
        setTimeout(() => {
          localStorage.setItem('multiQRScanResults', JSON.stringify(finalResults));
        }, 0);
        
        return finalResults;
      }
      
      return prev;
    });
  };

  const handleSingleResult = (result: ScanResult) => {
    // Check if this result is already in our unique set
    if (uniqueCodesSet.current.has(result.text)) {
      console.log('Single result duplicate filtered out:', result.text.substring(0, 30) + '...');
      return;
    }

    // Add to unique set and results
    uniqueCodesSet.current.add(result.text);
    console.log('Single result new code added:', result.text.substring(0, 30) + '...');
    
    setScanResults(prev => {
      const newResults = [result, ...prev];
      // Keep only last 100 results
      const finalResults = newResults.slice(0, 100);
      
      // Force localStorage update for mobile
      setTimeout(() => {
        localStorage.setItem('multiQRScanResults', JSON.stringify(finalResults));
      }, 0);
      
      return finalResults;
    });
  };

  // Results handling is now managed by UltraFastResultsDisplay component

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

  const clearResults = () => {
    setScanResults([]);
    uniqueCodesSet.current.clear();
    localStorage.removeItem('multiQRScanResults');
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
                <p className="text-sm text-gray-600">Fast multi-code detection</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Scanner Title */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Multi-QR Scanner
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Fast and reliable multi-code detection
                </p>
              </div>

              {/* True Multi-Code Scanner Component */}
              <TrueMultiCodeScanner
                onResults={handleScanResults}
                onSingleResult={handleSingleResult}
                maxCodes={10}
              />
              
              {/* Demo Setup Component */}
              <div className="mt-6">
                <UltraFastDemoSetup />
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Fast Detection</h3>
                  <p className="text-sm text-gray-600">
                    Quick and reliable QR code detection
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Camera className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Multi-Code Support</h3>
                  <p className="text-sm text-gray-600">
                    Detect multiple QR codes simultaneously
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Mobile Optimized</h3>
                  <p className="text-sm text-gray-600">
                    Works great on mobile devices and PWA
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>

                    {/* Ultra-Fast Results Display */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="h-full"
            >
              <UltraFastResultsDisplay 
                results={scanResults}
                maxDisplay={50}
                onClear={clearResults}
              />
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
