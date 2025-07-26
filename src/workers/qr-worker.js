// Import jsQR for proper QR code detection
import jsQR from 'jsqr';

// Process image data for QR codes using jsQR
async function processImageData(imageData, width, height) {
  try {
    console.log(`Processing frame: ${width}x${height}, data length: ${imageData.length}`);
    
    // Use jsQR with optimized settings for better detection
    const result = jsQR(imageData, width, height, {
      inversionAttempts: "attemptBoth"
    });

    if (result) {
      console.log('QR code detected in worker:', result.data);
      return [{
        text: result.data,
        format: 'QR_CODE',
        timestamp: Date.now(),
        confidence: 1.0
      }];
    }

    return [];
  } catch (error) {
    console.error('Error processing image data:', error);
    return [];
  }
}

// Handle messages from main thread
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'INIT':
      try {
        console.log('Worker initialized successfully with jsQR');
        self.postMessage({ type: 'INIT_SUCCESS' });
      } catch (error) {
        console.error('Worker init error:', error);
        self.postMessage({ type: 'INIT_ERROR', error: error.message });
      }
      break;
      
    case 'PROCESS_FRAME':
      try {
        const { imageData, width, height, frameId } = data;
        console.log(`Worker processing frame ${frameId}: ${width}x${height}`);
        
        const results = await processImageData(imageData, width, height);
        
        console.log(`Frame ${frameId} results:`, results.length);
        
        self.postMessage({ 
          type: 'FRAME_RESULTS', 
          results, 
          frameId 
        });
      } catch (error) {
        console.error('Frame processing error:', error);
        self.postMessage({ 
          type: 'FRAME_ERROR', 
          error: error.message,
          frameId: data.frameId 
        });
      }
      break;
      
    case 'TERMINATE':
      console.log('Worker terminating');
      self.close();
      break;
  }
}; 