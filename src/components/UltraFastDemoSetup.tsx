import { useState } from 'react';

const UltraFastDemoSetup: React.FC = () => {
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  
  const sampleData = [
    'https://example.com/product/1',
    'https://example.com/product/2', 
    'https://example.com/product/3',
    'Item: ABC123 - Laptop',
    'Item: DEF456 - Mouse',
    'Item: GHI789 - Keyboard',
    'Contact: John Doe - +1234567890',
    'Contact: Jane Smith - +0987654321',
    'Location: Building A, Floor 2',
    'Location: Building B, Floor 1',
    'Inventory: SKU001 - Stock: 50',
    'Inventory: SKU002 - Stock: 25',
    'Event: Meeting Room A - 2:00 PM',
    'Event: Conference Hall - 3:00 PM',
    'WiFi: Network_A - Pass: 12345',
    'WiFi: Network_B - Pass: 67890',
    'Document: Report_2024_Q1.pdf',
    'Document: Proposal_Client_X.docx',
    'Payment: Invoice #1001 - $250.00',
    'Payment: Invoice #1002 - $175.50',
    'Serial: Device001-ABC123XYZ',
    'Serial: Device002-DEF456UVW',
    'Tracking: Package #TRK001',
    'Tracking: Package #TRK002',
    'QA Code: PASS - Batch #2024A',
    'QA Code: FAIL - Batch #2024B',
    'Access: Door A1 - Level 3',
    'Access: Door B2 - Level 1',
    'Batch: Production #P001',
    'Batch: Production #P002',
  ];

  const generateQRCodes = (count: number) => {
    const codes = sampleData.slice(0, count);
    setGeneratedCodes(codes);
  };

  const generateQRCodeHTML = (data: string, index: number) => {
    return `
      <div style="display: inline-block; margin: 10px; text-align: center;">
        <div id="qr${index}" style="width: 150px; height: 150px; margin: 0 auto;"></div>
        <p style="font-size: 10px; margin: 5px 0; word-break: break-all; width: 150px;">${data}</p>
      </div>
    `;
  };

  const generateTestPage = () => {
    const qrCodes = generatedCodes.map((code, index) => generateQRCodeHTML(code, index)).join('');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Ultra-Fast QR Scanner Test Page</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #f0f0f0;
        }
        .header {
            text-align: center; 
            margin-bottom: 30px;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .qr-grid { 
            display: flex; 
            flex-wrap: wrap; 
            justify-content: center;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .instructions {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2196F3;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Ultra-Fast Multi QR Scanner Test</h1>
        <p><strong>${generatedCodes.length} QR Codes</strong> for simultaneous scanning</p>
    </div>
    
    <div class="instructions">
        <h3>📋 Testing Instructions:</h3>
        <ol>
            <li><strong>Open your Ultra-Fast Scanner app</strong></li>
            <li><strong>Point camera at this page</strong> - make sure multiple QR codes are visible</li>
            <li><strong>Watch real-time detection</strong> of all visible codes simultaneously</li>
            <li><strong>Try different arrangements:</strong> close-up for few codes, zoomed-out for many</li>
            <li><strong>Performance target:</strong> 60fps scanning with instant multi-code recognition</li>
        </ol>
        <p><em>💡 Tip: Adjust your screen brightness and camera distance for optimal scanning</em></p>
    </div>
    
    <div class="qr-grid">
        ${qrCodes}
    </div>

    <script>
        // Generate all QR codes
        ${generatedCodes.map((code, index) => `
        QRCode.toCanvas(document.getElementById('qr${index}'), '${code}', {
            width: 150,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });`).join('')}
        
        console.log('Generated ${generatedCodes.length} QR codes for testing');
    </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultra-fast-qr-test-${generatedCodes.length}-codes.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          🧪 Demo Test Setup
        </h3>
        <p className="text-sm text-gray-600">
          Generate test pages with multiple QR codes to showcase the ultra-fast scanner's capabilities
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Test Sets:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[10, 20, 30, 50].map(count => (
              <button
                key={count}
                onClick={() => generateQRCodes(count)}
                className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
              >
                {count} Codes
              </button>
            ))}
          </div>
        </div>

        {generatedCodes.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">
                ✅ Ready: {generatedCodes.length} QR codes generated
              </span>
              <button
                onClick={generateTestPage}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                📄 Download Test Page
              </button>
            </div>
            <p className="text-xs text-green-700">
              This will create an HTML file you can open in your browser to test the scanner
            </p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">🎯 Client Demo Tips:</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Start with 10 codes to show basic functionality</li>
            <li>• Progress to 30-50 codes to demonstrate scale</li>
            <li>• Show real-time detection with 60fps performance</li>
            <li>• Highlight instant multi-code recognition</li>
            <li>• Demonstrate different code arrangements and distances</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UltraFastDemoSetup; 