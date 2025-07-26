import { useState, useEffect, useRef } from 'react';
import type { ScanResult } from '../types';

interface UltraFastResultsDisplayProps {
  results: ScanResult[];
  maxDisplay?: number;
  onClear?: () => void;
}

const UltraFastResultsDisplay: React.FC<UltraFastResultsDisplayProps> = ({ 
  results, 
  maxDisplay = 50,
  onClear
}) => {
  const [displayResults, setDisplayResults] = useState<ScanResult[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Immediate updates for mobile compatibility
  useEffect(() => {
    setDisplayResults(results.slice(0, maxDisplay));
    lastUpdateRef.current = Date.now();
  }, [results, maxDisplay]);

  // Auto-scroll to show new results
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [displayResults.length]);

  const exportResults = () => {
    const data = displayResults.map(result => ({
      text: result.text,
      timestamp: result.timestamp.toISOString(),
      format: result.format,
      confidence: result.confidence
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultra-fast-qr-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAllToClipboard = () => {
    const allTexts = displayResults.map(r => r.text).join('\n');
    navigator.clipboard.writeText(allTexts);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            ⚡ Live Results
            <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded-full">
              {displayResults.length} codes
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">Real-time • Ultra-fast processing</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
            title="Clear all results"
          >
            🗑️ Clear
          </button>
          <button
            onClick={copyAllToClipboard}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
            title="Copy all to clipboard"
          >
            📋 Copy All
          </button>
          <button
            onClick={exportResults}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
            title="Export as JSON"
          >
            💾 Export
          </button>
        </div>
      </div>

      {/* Results List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: '500px' }}
      >
        {displayResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">Start scanning to see results</p>
              <p className="text-xs text-gray-400 mt-1">Up to {maxDisplay} codes supported</p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {displayResults.map((result, index) => (
              <div
                key={result.id}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  index === 0 
                    ? 'bg-green-50 border-green-200 shadow-sm' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                      {result.confidence && (
                        <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                          {Math.round(result.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-900 break-all leading-tight">
                      {result.text.length > 100 ? (
                        <details className="cursor-pointer">
                          <summary className="font-medium">
                            {result.text.substring(0, 100)}...
                          </summary>
                          <div className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                            {result.text}
                          </div>
                        </details>
                      ) : (
                        <span className="font-medium">{result.text}</span>
                      )}
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(result.text)}
                        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                      >
                        Copy
                      </button>
                      {result.text.startsWith('http') && (
                        <a
                          href={result.text}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded transition-colors"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {index === 0 && (
                    <div className="text-green-500 text-xs font-bold">
                      NEW
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Total: {displayResults.length} codes detected</span>
          <span>Capacity: {displayResults.length}/{maxDisplay}</span>
        </div>
        
        {displayResults.length > 0 && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(displayResults.length / maxDisplay) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UltraFastResultsDisplay; 