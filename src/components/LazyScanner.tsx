import { lazy, Suspense } from 'react';
import type { ScanResult } from '../types';

// Lazy load the heavy Scanner component
const Scanner = lazy(() => import('./Scanner'));

interface LazyScannerProps {
  onResult: (result: ScanResult) => void;
}

const ScannerFallback = () => (
  <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading camera scanner...</p>
    </div>
  </div>
);

const LazyScanner: React.FC<LazyScannerProps> = ({ onResult }) => {
  return (
    <Suspense fallback={<ScannerFallback />}>
      <Scanner onResult={onResult} />
    </Suspense>
  );
};

export default LazyScanner; 