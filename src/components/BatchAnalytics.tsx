import React from 'react';
import type { ScanResult } from '../types';

interface BatchAnalyticsProps {
  results: ScanResult[];
  isScanning: boolean;
  startTime?: number;
}

const BatchAnalytics: React.FC<BatchAnalyticsProps> = ({ results, isScanning, startTime }) => {
  const now = Date.now();
  const scanningDuration = startTime ? (now - startTime) / 1000 : 0;
  const scansPerMinute = results.length > 0 && scanningDuration > 0 
    ? Math.round((results.length / scanningDuration) * 60) 
    : 0;

  // Calculate format distribution
  const formatCounts = results.reduce((acc, result) => {
    const format = result.format || 'Unknown';
    acc[format] = (acc[format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find duplicates
  const textCounts = results.reduce((acc, result) => {
    acc[result.text] = (acc[result.text] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const duplicateCount = Object.values(textCounts).filter(count => count > 1).length;
  const uniqueCount = Object.keys(textCounts).length;

  // Calculate scanning speed trend (last 5 scans)
  const recentScans = results.slice(-5);
  const avgTimeBetweenScans = recentScans.length > 1 
    ? recentScans.reduce((acc, scan, index) => {
        if (index === 0) return acc;
        const timeDiff = scan.timestamp.getTime() - recentScans[index - 1].timestamp.getTime();
        return acc + timeDiff;
      }, 0) / (recentScans.length - 1) / 1000
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Batch Analytics
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{results.length}</div>
          <div className="text-sm text-blue-800">Total Scans</div>
        </div>

        {/* Unique Codes */}
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{uniqueCount}</div>
          <div className="text-sm text-green-800">Unique Codes</div>
        </div>

        {/* Scan Rate */}
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {isScanning ? scansPerMinute : '--'}
          </div>
          <div className="text-sm text-purple-800">Scans/Min</div>
        </div>

        {/* Duplicates */}
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{duplicateCount}</div>
          <div className="text-sm text-orange-800">Duplicates</div>
        </div>
      </div>

      {/* Performance Metrics */}
      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Scanning Speed */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Average scan interval:</span>
            <span className="font-medium">
              {avgTimeBetweenScans > 0 ? `${avgTimeBetweenScans.toFixed(1)}s` : 'N/A'}
            </span>
          </div>

          {/* Session Duration */}
          {startTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Session duration:</span>
              <span className="font-medium">
                {scanningDuration > 60 
                  ? `${Math.floor(scanningDuration / 60)}m ${Math.floor(scanningDuration % 60)}s`
                  : `${Math.floor(scanningDuration)}s`
                }
              </span>
            </div>
          )}

          {/* Efficiency Score */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Efficiency:</span>
            <span className="font-medium">
              {results.length > 0 
                ? `${Math.round((uniqueCount / results.length) * 100)}%`
                : 'N/A'
              }
            </span>
          </div>
        </div>
      )}

      {/* Format Distribution */}
      {Object.keys(formatCounts).length > 0 && (
        <div className="mt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Code Formats:</h5>
          <div className="space-y-1">
            {Object.entries(formatCounts).map(([format, count]) => (
              <div key={format} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{format}:</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(count / results.length) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Status */}
      {isScanning && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800 font-medium">
              Scanning Active - {scansPerMinute} scans/min
            </span>
          </div>
          {avgTimeBetweenScans > 0 && (
            <div className="text-xs text-green-700 mt-1">
              Last scan: {avgTimeBetweenScans.toFixed(1)}s ago
            </div>
          )}
        </div>
      )}

      {/* Performance Tips */}
      {results.length > 5 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h6 className="text-sm font-medium text-blue-900 mb-1">💡 Performance Tips:</h6>
          <div className="text-xs text-blue-800 space-y-1">
            {scansPerMinute < 30 && (
              <div>• Try reducing scan delay for faster scanning</div>
            )}
            {duplicateCount > results.length * 0.2 && (
              <div>• Consider enabling duplicate skipping</div>
            )}
            {avgTimeBetweenScans > 3 && (
              <div>• Ensure good lighting and hold steady</div>
            )}
            {uniqueCount / results.length < 0.8 && (
              <div>• Many duplicates detected - check your setup</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchAnalytics; 