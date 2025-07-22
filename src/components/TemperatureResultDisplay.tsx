import React, { useState } from 'react';
import TemperatureSimulator from './TemperatureSimulator';

interface TemperatureData {
  // New format
  "-10-0"?: string;
  "0-20"?: string;
  "20-30"?: string;
  "30-40"?: string;
  "40-60"?: string;
  "60-100"?: string;
  "100-200"?: string;
  
  // Legacy format (for backward compatibility)
  "40-50"?: string;
  
  currentTemp?: number;
  timestamp?: string;
  type?: string;
  version?: string;
}

interface TemperatureResultDisplayProps {
  data: TemperatureData;
  timestamp: Date;
}

const TemperatureResultDisplay: React.FC<TemperatureResultDisplayProps> = ({ data, timestamp }) => {
  const [currentTemp, setCurrentTemp] = useState<number>(data.currentTemp || 25);
  const [showSimulator, setShowSimulator] = useState(false);

  const getCurrentRange = (temp: number) => {
    if (temp < 0) return { range: "below-0", label: "Freezing", color: "#1E40AF", intensity: 1 };
    if (temp >= 0 && temp < 20) return { range: "0-20", label: "Cold", color: "#3B82F6", intensity: 1 };
    if (temp >= 20 && temp < 30) return { range: "20-30", label: "Cool", color: "#06B6D4", intensity: 1 };
    if (temp >= 30 && temp < 40) return { range: "30-40", label: "Warm", color: "#F59E0B", intensity: 1 };
    if (temp >= 40 && temp < 60) return { range: "40-60", label: "Hot", color: "#EF4444", intensity: 1 };
    if (temp >= 60 && temp < 100) return { range: "60-100", label: "Very Hot", color: "#DC2626", intensity: 1 };
    if (temp >= 100) return { range: "100+", label: "Extreme", color: "#7C2D12", intensity: 1 };
    return { range: "30-40", label: "Warm", color: "#F59E0B", intensity: 1 };
  };

  const getTemperatureFading = (temp: number) => {
    // Create fading effect based on temperature with expanded ranges
    const ranges = [
      { min: -10, max: 0, color: "#1E40AF", label: "Freezing" },
      { min: 0, max: 20, color: "#3B82F6", label: "Cold" },
      { min: 20, max: 30, color: "#06B6D4", label: "Cool" },
      { min: 30, max: 40, color: "#F59E0B", label: "Warm" },
      { min: 40, max: 60, color: "#EF4444", label: "Hot" },
      { min: 60, max: 100, color: "#DC2626", label: "Very Hot" },
      { min: 100, max: 200, color: "#7C2D12", label: "Extreme" }
    ];

    return ranges.map(range => {
      let opacity = 0.1;
      let intensity = 0;
      
      if (temp >= range.min && temp < range.max) {
        opacity = 1;
        intensity = 1;
      } else {
        // Calculate proximity for fading effect with different scaling for different ranges
        const distance = Math.min(
          Math.abs(temp - range.min),
          Math.abs(temp - range.max)
        );
        
        // Adjust fading distance based on temperature range
        let fadingDistance = 15; // Default
        if (range.min >= 60) fadingDistance = 30; // Wider fading for very hot ranges
        if (range.min >= 100) fadingDistance = 50; // Even wider for extreme ranges
        
        opacity = Math.max(0.1, 1 - (distance / fadingDistance));
        intensity = opacity;
      }

      return {
        ...range,
        opacity: opacity,
        intensity: intensity
      };
    });
  };

  const handleTemperatureChange = (temp: number) => {
    setCurrentTemp(temp);
  };

  const currentRange = getCurrentRange(currentTemp);
  const fadingRanges = getTemperatureFading(currentTemp);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4" style={{ borderLeftColor: currentRange.color }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Temperature QR Code</h3>
            <p className="text-xs text-gray-500">
              {timestamp.toLocaleTimeString()} • {timestamp.toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: currentRange.color }}></div>
          <span className="text-sm font-medium">{currentTemp}°C</span>
          <span className="text-xs text-gray-500">({currentRange.label})</span>
        </div>
      </div>

      {/* Temperature Simulation Toggle */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Real-World Temperature Testing</label>
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              showSimulator 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            {showSimulator ? 'Hide Simulator' : 'Show Simulator'}
          </button>
        </div>
        
        {!showSimulator && (
          <>
            <input
              type="range"
              min="-10"
              max="200"
              step="0.1"
              value={currentTemp}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  rgba(30, 64, 175, ${fadingRanges[0] ? fadingRanges[0].opacity : 0.1}) 0%, 
                  rgba(30, 64, 175, ${fadingRanges[0] ? fadingRanges[0].opacity : 0.1}) 5%, 
                  rgba(59, 130, 246, ${fadingRanges[1] ? fadingRanges[1].opacity : 0.1}) 5%, 
                  rgba(59, 130, 246, ${fadingRanges[1] ? fadingRanges[1].opacity : 0.1}) 15%, 
                  rgba(6, 182, 212, ${fadingRanges[2] ? fadingRanges[2].opacity : 0.1}) 15%, 
                  rgba(6, 182, 212, ${fadingRanges[2] ? fadingRanges[2].opacity : 0.1}) 25%, 
                  rgba(245, 158, 11, ${fadingRanges[3] ? fadingRanges[3].opacity : 0.1}) 25%, 
                  rgba(245, 158, 11, ${fadingRanges[3] ? fadingRanges[3].opacity : 0.1}) 35%, 
                  rgba(239, 68, 68, ${fadingRanges[4] ? fadingRanges[4].opacity : 0.1}) 35%, 
                  rgba(239, 68, 68, ${fadingRanges[4] ? fadingRanges[4].opacity : 0.1}) 55%, 
                  rgba(220, 38, 38, ${fadingRanges[5] ? fadingRanges[5].opacity : 0.1}) 55%, 
                  rgba(220, 38, 38, ${fadingRanges[5] ? fadingRanges[5].opacity : 0.1}) 75%, 
                  rgba(124, 45, 18, ${fadingRanges[6] ? fadingRanges[6].opacity : 0.1}) 75%, 
                  rgba(124, 45, 18, ${fadingRanges[6] ? fadingRanges[6].opacity : 0.1}) 100%)`
              }}
            />
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-10°C</span>
              <span>0°C</span>
              <span>25°C</span>
              <span>60°C</span>
              <span>100°C</span>
              <span>200°C</span>
            </div>
          </>
        )}
      </div>

      {/* Temperature Simulator */}
      {showSimulator && (
        <div className="mb-4">
          <TemperatureSimulator 
            currentTemp={currentTemp}
            onTemperatureChange={handleTemperatureChange}
          />
        </div>
      )}

      {/* Dynamic Color Fading Display */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
          Temperature Color Fading
        </h4>
        <div className="grid gap-2">
          {fadingRanges.map((range, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                range.intensity > 0.7 ? 'transform scale-105 shadow-lg' : ''
              }`}
              style={{ 
                backgroundColor: `${range.color}${Math.round(range.opacity * 255).toString(16).padStart(2, '0')}`,
                borderColor: range.color,
                borderWidth: range.intensity > 0.7 ? '2px' : '1px',
                boxShadow: range.intensity > 0.7 ? `0 0 20px ${range.color}40` : 'none'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: range.color,
                      opacity: range.intensity,
                      boxShadow: range.intensity > 0.7 ? `0 0 10px ${range.color}` : 'none'
                    }}
                  ></div>
                  <span className="text-sm font-medium text-gray-800">
                    {range.label} ({range.min}-{range.max}°C)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">
                    {Math.round(range.intensity * 100)}%
                  </span>
                  {range.intensity > 0.7 && (
                    <span className="text-xs bg-white bg-opacity-80 text-gray-800 px-2 py-1 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
              
                             {range.intensity > 0.5 && (
                 <p className="text-sm text-gray-700 mt-2">
                   {data[`${range.min}-${range.max}` as keyof TemperatureData] || 
                    `Temperature range ${range.min}-${range.max}°C message`}
                 </p>
               )}
            </div>
          ))}
        </div>
      </div>

      {/* Temperature History */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 via-yellow-50 to-red-50 rounded-lg">
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
          Temperature Visualization (-10°C to 200°C)
        </h4>
        <div className="flex items-center gap-0.5 h-8">
          {Array.from({ length: 42 }, (_, i) => {
            const temp = -10 + (i * 5); // Every 5 degrees from -10 to 200
            const isCurrentTemp = Math.abs(temp - currentTemp) < 2.5;
            const range = getCurrentRange(temp);
            
            return (
              <div
                key={i}
                className={`flex-1 rounded transition-all duration-300 ${
                  isCurrentTemp ? 'h-8 animate-pulse' : 'h-4'
                }`}
                style={{
                  backgroundColor: range.color,
                  opacity: isCurrentTemp ? 1 : 0.3,
                  boxShadow: isCurrentTemp ? `0 0 8px ${range.color}` : 'none'
                }}
                title={`${temp}°C`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>-10°C</span>
          <span style={{ color: currentRange.color, fontWeight: 'bold' }}>
            {currentTemp}°C ({currentRange.label})
          </span>
          <span>200°C</span>
        </div>
      </div>

      {/* QR Generation Time */}
      {data.timestamp && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            QR Generated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default TemperatureResultDisplay; 