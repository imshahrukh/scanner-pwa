// Ultra-fast QR detection worker (simplified version)
console.log('🚀 Ultra-fast worker loaded');

// Simulate QR detection for testing
function simulateQRDetection(imageData, width, height) {
  // Simple simulation - check for high contrast areas
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  // Sample pixels in center area
  let darkPixels = 0;
  let totalPixels = 0;
  
  for (let y = centerY - 50; y < centerY + 50; y += 10) {
    for (let x = centerX - 50; x < centerX + 50; x += 10) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const index = (y * width + x) * 4;
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness < 128) {
          darkPixels++;
        }
        totalPixels++;
      }
    }
  }
  
  // If we have significant dark areas, simulate QR detection
  if (darkPixels > totalPixels * 0.3) {
    return [{
      text: `Simulated QR Code ${Date.now()}`,
      format: 'QR_CODE',
      timestamp: Date.now(),
      confidence: 0.8,
      region: 'center'
    }];
  }
  
  return [];
}

// Process frame with ultra-fast detection
async function processFrame(imageData, width, height) {
  try {
    console.log(`🔍 Processing frame: ${width}x${height}, data length: ${imageData.length}`);
    
    // Simulate processing multiple regions
    const regions = [
      { name: 'full', x: 0, y: 0, w: 1, h: 1 },
      { name: 'center', x: 0.25, y: 0.25, w: 0.5, h: 0.5 }
    ];
    
    const allResults = [];
    
    for (const region of regions) {
      const results = simulateQRDetection(imageData, width, height);
      allResults.push(...results);
    }
    
    console.log(`📊 Found ${allResults.length} results from all regions`);
    
    // Deduplicate results
    const uniqueResults = [];
    const seen = new Set();
    
    for (const result of allResults) {
      if (!seen.has(result.text)) {
        seen.add(result.text);
        uniqueResults.push(result);
      }
    }
    
    console.log(`✅ Returning ${uniqueResults.length} unique results`);
    return uniqueResults;
  } catch (error) {
    console.error('❌ Frame processing error:', error);
    return [];
  }
}

// Handle messages from main thread
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'INIT':
      try {
        console.log('🚀 Ultra-fast worker initialized');
        self.postMessage({ type: 'INIT_SUCCESS' });
      } catch (error) {
        self.postMessage({ type: 'INIT_ERROR', error: error.message });
      }
      break;
      
    case 'PROCESS_FRAME':
      try {
        const { imageData, width, height, frameId } = data;
        console.log(`🚀 Worker received frame ${frameId}: ${width}x${height}`);
        
        const results = await processFrame(imageData, width, height);
        
        console.log(`📤 Sending ${results.length} results back to main thread`);
        
        self.postMessage({ 
          type: 'FRAME_RESULTS', 
          results, 
          frameId 
        });
      } catch (error) {
        console.error('❌ Worker processing error:', error);
        self.postMessage({ 
          type: 'FRAME_ERROR', 
          error: error.message,
          frameId: data.frameId 
        });
      }
      break;
      
    case 'TERMINATE':
      console.log('🛑 Worker terminating');
      self.close();
      break;
  }
}; 