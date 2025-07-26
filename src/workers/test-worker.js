// Simple test worker to verify communication
console.log('🧪 Test worker loaded');

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  console.log('🧪 Test worker received message:', type, data);
  
  switch (type) {
    case 'INIT':
      console.log('🧪 Test worker initialized');
      self.postMessage({ type: 'INIT_SUCCESS' });
      break;
      
    case 'PROCESS_FRAME':
      console.log('🧪 Test worker processing frame:', data.frameId);
      
      // Simulate processing delay
      setTimeout(() => {
        console.log('🧪 Test worker sending results');
        self.postMessage({ 
          type: 'FRAME_RESULTS', 
          results: [
            {
              text: `Test QR Code ${Date.now()}`,
              format: 'QR_CODE',
              timestamp: Date.now(),
              confidence: 1.0,
              region: 'test'
            }
          ], 
          frameId: data.frameId 
        });
      }, 100);
      break;
      
    case 'TERMINATE':
      console.log('🧪 Test worker terminating');
      self.close();
      break;
  }
}; 