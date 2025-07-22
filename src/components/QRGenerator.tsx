import React, { useState, useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface QRGeneratorProps {
  onGenerated?: (data: string) => void;
}

interface TemperatureRange {
  min: number;
  max: number;
  label: string;
  data: string;
  color: string;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ onGenerated }) => {
  const [temperature, setTemperature] = useState<number>(27);
  const [customData, setCustomData] = useState({
    freezing: 'Freezing temperature - extreme cold detected',
    cold: 'Cold temperature - bundle up and stay warm',
    cool: 'Cool temperature - wear light layers',
    warm: 'Warm temperature - stay hydrated',
    hot: 'Hot temperature - seek shade and drink water',
    veryhot: 'Very hot temperature - extreme heat warning',
    extreme: 'Extreme temperature - dangerous heat levels'
  });
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const temperatureRanges: TemperatureRange[] = [
    { min: -10, max: 0, label: 'Freezing', data: customData.freezing, color: '#1E40AF' },
    { min: 0, max: 20, label: 'Cold', data: customData.cold, color: '#3B82F6' },
    { min: 20, max: 30, label: 'Cool', data: customData.cool, color: '#06B6D4' },
    { min: 30, max: 40, label: 'Warm', data: customData.warm, color: '#F59E0B' },
    { min: 40, max: 60, label: 'Hot', data: customData.hot, color: '#EF4444' },
    { min: 60, max: 100, label: 'Very Hot', data: customData.veryhot, color: '#DC2626' },
    { min: 100, max: 200, label: 'Extreme', data: customData.extreme, color: '#7C2D12' }
  ];

  const getCurrentRange = (temp: number): TemperatureRange => {
    return temperatureRanges.find(range => temp >= range.min && temp < range.max) || temperatureRanges[1];
  };

  const generateQRData = () => {
    const qrData = {
      "-10-0": customData.freezing,
      "0-20": customData.cold,
      "20-30": customData.cool,
      "30-40": customData.warm,
      "40-60": customData.hot,
      "60-100": customData.veryhot,
      "100-200": customData.extreme,
      currentTemp: temperature,
      timestamp: new Date().toISOString(),
      type: "temperature-qr",
      version: "2.0"
    };
    return JSON.stringify(qrData);
  };

  const createQRCode = () => {
    const currentRange = getCurrentRange(temperature);
    const qrData = generateQRData();
    
    const qrCodeInstance = new QRCodeStyling({
      width: 300,
      height: 300,
      type: 'svg',
      data: qrData,
      image: undefined,
      dotsOptions: {
        color: currentRange.color,
        type: 'rounded'
      },
      cornersSquareOptions: {
        color: currentRange.color,
        type: 'extra-rounded'
      },
      cornersDotOptions: {
        color: currentRange.color,
        type: 'dot'
      },
      backgroundOptions: {
        color: '#ffffff',
      },
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'M'
      }
    });

    setQrCode(qrCodeInstance);
    onGenerated?.(qrData);
  };

  useEffect(() => {
    createQRCode();
  }, [temperature, customData]);

  useEffect(() => {
    if (qrCode && qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCode.append(qrRef.current);
    }
  }, [qrCode]);

  const downloadQR = (format: 'png' | 'svg') => {
    if (!qrCode) return;
    
    if (format === 'png') {
      qrCode.download({ name: `temperature-qr-${temperature}C`, extension: 'png' });
    } else {
      qrCode.download({ name: `temperature-qr-${temperature}C`, extension: 'svg' });
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrRef.current) return;
    
    const qrContent = qrRef.current.innerHTML;
    const currentRange = getCurrentRange(temperature);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Temperature QR Code - ${temperature}°C</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            text-align: center; 
          }
          .qr-container { 
            border: 2px solid ${currentRange.color}; 
            border-radius: 10px; 
            padding: 20px; 
            margin: 20px auto; 
            max-width: 400px; 
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            color: ${currentRange.color}; 
            margin-bottom: 10px; 
          }
          .temp-info { 
            font-size: 16px; 
            color: #666; 
            margin-bottom: 20px; 
          }
          .instructions { 
            font-size: 12px; 
            color: #888; 
            margin-top: 20px; 
            line-height: 1.4;
          }
          .range-info {
            background: ${currentRange.color}20;
            border: 1px solid ${currentRange.color}40;
            border-radius: 5px;
            padding: 10px;
            margin: 10px 0;
            font-size: 12px;
          }
          .footer {
            margin-top: 30px;
            font-size: 10px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <div class="title">Temperature QR Code</div>
          <div class="temp-info">Generated at ${temperature}°C (${currentRange.label})</div>
          ${qrContent}
          <div class="range-info">
            <strong>Temperature Ranges:</strong><br>
            🔵 Cool: 20-30°C | 🟠 Warm: 30-40°C | 🔴 Hot: 40-50°C
          </div>
          <div class="instructions">
            <strong>How to test:</strong><br>
            1. Print this QR code<br>
            2. Scan with your phone using the QR Scanner app<br>
            3. Use the Temperature Simulator to test different conditions<br>
            4. Watch colors change as temperature varies
          </div>
          <div class="footer">
            Generated: ${new Date().toLocaleString()}<br>
            Temperature QR System v1.0
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const currentRange = getCurrentRange(temperature);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-center mb-6">Temperature QR Generator</h2>
      
      {/* Temperature Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Temperature: {temperature}°C
        </label>
        <input
          type="range"
          min="-10"
          max="200"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #1E40AF 0%, #1E40AF 5%, #3B82F6 5%, #3B82F6 15%, #06B6D4 15%, #06B6D4 25%, #F59E0B 25%, #F59E0B 35%, #EF4444 35%, #EF4444 55%, #DC2626 55%, #DC2626 75%, #7C2D12 75%, #7C2D12 100%)`
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
      </div>

      {/* Current Range Display */}
      <div className="mb-6 p-3 rounded-lg border" style={{ borderColor: currentRange.color, backgroundColor: `${currentRange.color}10` }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentRange.color }}></div>
          <span className="font-medium">{currentRange.label} Range ({currentRange.min}-{currentRange.max}°C)</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{currentRange.data}</p>
      </div>

      {/* Important Note */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Important Note:</h3>
        <p className="text-sm text-yellow-700">
          This QR code doesn't physically change color when heated. It's a <strong>simulation system</strong> - 
          the colors change in the app based on temperature input. Perfect for testing temperature-responsive 
          UI designs and demonstrations!
        </p>
      </div>

      {/* Custom Data Input */}
      <div className="mb-6 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Customize Temperature Messages:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Freezing (-10-0°C):</label>
            <input
              type="text"
              value={customData.freezing}
              onChange={(e) => setCustomData(prev => ({ ...prev, freezing: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="Message for freezing temperatures"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Cold (0-20°C):</label>
            <input
              type="text"
              value={customData.cold}
              onChange={(e) => setCustomData(prev => ({ ...prev, cold: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="Message for cold temperatures"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Cool (20-30°C):</label>
            <input
              type="text"
              value={customData.cool}
              onChange={(e) => setCustomData(prev => ({ ...prev, cool: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Message for cool temperatures"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Warm (30-40°C):</label>
            <input
              type="text"
              value={customData.warm}
              onChange={(e) => setCustomData(prev => ({ ...prev, warm: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Message for warm temperatures"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Hot (40-60°C):</label>
            <input
              type="text"
              value={customData.hot}
              onChange={(e) => setCustomData(prev => ({ ...prev, hot: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Message for hot temperatures"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Very Hot (60-100°C):</label>
            <input
              type="text"
              value={customData.veryhot}
              onChange={(e) => setCustomData(prev => ({ ...prev, veryhot: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Message for very hot temperatures"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Extreme (100-200°C):</label>
            <input
              type="text"
              value={customData.extreme}
              onChange={(e) => setCustomData(prev => ({ ...prev, extreme: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-900 focus:border-transparent"
              placeholder="Message for extreme temperatures (ovens, etc.)"
            />
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="mb-6">
        <div className="flex justify-center">
          <div 
            ref={qrRef} 
            className="border-2 border-gray-200 rounded-lg p-4 bg-white"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={printQR}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print QR Code for Testing
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={() => downloadQR('png')}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Download PNG
          </button>
          <button
            onClick={() => downloadQR('svg')}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Download SVG
          </button>
        </div>
      </div>

      {/* QR Data Preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-xs font-medium text-gray-700 mb-1">QR Code Data:</h4>
        <pre className="text-xs text-gray-600 overflow-x-auto">
          {JSON.stringify(JSON.parse(generateQRData()), null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default QRGenerator; 