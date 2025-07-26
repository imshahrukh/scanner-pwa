import { proxy } from 'comlink';

export interface QRResult {
  text: string;
  format: string;
  timestamp: number;
  confidence: number;
}

export interface FrameData {
  imageData: ImageData;
  width: number;
  height: number;
  frameId: string;
}

class WorkerPoolManager {
  private workers: Worker[] = [];
  private workerQueue: FrameData[] = [];
  private activeWorkers = new Set<Worker>();
  private results: QRResult[] = [];
  private isProcessing = false;
  private maxWorkers: number;
  private onResultsCallback?: (results: QRResult[]) => void;

  constructor(maxWorkers = 2) {
    this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 2);
    this.initializeWorkers();
  }

  private initializeWorkers() {
    console.log(`🔄 Initializing ${this.maxWorkers} workers...`);
    
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(new URL('../workers/qr-worker.js', import.meta.url), {
          type: 'module'
        });
        
        worker.onmessage = (e) => this.handleWorkerMessage(e, worker);
        worker.onerror = (error) => this.handleWorkerError(error, worker);
        
        this.workers.push(worker);
        
        // Initialize the worker
        worker.postMessage({ type: 'INIT' });
        
        console.log(`✅ Worker ${i + 1} created and initialized`);
      } catch (error) {
        console.error(`❌ Failed to create worker ${i + 1}:`, error);
      }
    }
    
    console.log(`✅ All ${this.maxWorkers} workers initialized`);
  }

  private handleWorkerMessage(event: MessageEvent, worker: Worker) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'INIT_SUCCESS':
        console.log('✅ Worker initialized successfully');
        break;
        
      case 'INIT_ERROR':
        console.error('❌ Worker initialization failed:', data.error);
        break;
        
      case 'FRAME_RESULTS':
        console.log(`📊 Received frame results: ${data.results.length} codes`);
        this.handleFrameResults(data.results, data.frameId);
        this.releaseWorker(worker);
        this.processNextFrame();
        break;
        
      case 'FRAME_ERROR':
        console.error('❌ Frame processing error:', data.error);
        this.releaseWorker(worker);
        this.processNextFrame();
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent, worker: Worker) {
    console.error('Worker error:', error);
    this.releaseWorker(worker);
    this.processNextFrame();
  }

  private handleFrameResults(results: QRResult[], frameId: string) {
    if (results.length > 0) {
      // Add new results
      this.results.push(...results);
      
      // Deduplicate results (same text within 5 seconds)
      this.results = this.deduplicateResults(this.results);
      
      // Call callback with all results
      if (this.onResultsCallback) {
        this.onResultsCallback([...this.results]);
      }
      
      console.log(`Frame ${frameId}: Found ${results.length} QR codes, Total: ${this.results.length}`);
    }
  }

  private deduplicateResults(results: QRResult[]): QRResult[] {
    const seen = new Map<string, number>();
    const now = Date.now();
    const deduplicated: QRResult[] = [];
    
    for (const result of results) {
      const key = result.text;
      const lastSeen = seen.get(key);
      
      // If we haven't seen this code in the last 5 seconds, add it
      if (!lastSeen || (now - lastSeen) > 5000) {
        seen.set(key, now);
        deduplicated.push(result);
      }
    }
    
    return deduplicated;
  }

  private getAvailableWorker(): Worker | null {
    return this.workers.find(worker => !this.activeWorkers.has(worker)) || null;
  }

  private releaseWorker(worker: Worker) {
    this.activeWorkers.delete(worker);
  }

  private processNextFrame() {
    if (this.workerQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) {
      console.log('No available workers, waiting...');
      return; // No available workers, wait for one to finish
    }

    const frameData = this.workerQueue.shift()!;
    this.activeWorkers.add(availableWorker);
    
    console.log(`Sending frame ${frameData.frameId} to worker`);
    
    availableWorker.postMessage({
      type: 'PROCESS_FRAME',
      data: {
        imageData: frameData.imageData.data,
        width: frameData.width,
        height: frameData.height,
        frameId: frameData.frameId
      }
    });
  }

  public processFrame(imageData: ImageData, width: number, height: number) {
    const frameId = `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Queueing frame ${frameId}: ${width}x${height}`);
    
    this.workerQueue.push({
      imageData,
      width,
      height,
      frameId
    });

    if (!this.isProcessing) {
      this.isProcessing = true;
      this.processNextFrame();
    }
  }

  public setResultsCallback(callback: (results: QRResult[]) => void) {
    this.onResultsCallback = callback;
  }

  public clearResults() {
    this.results = [];
  }

  public getResults(): QRResult[] {
    return [...this.results];
  }

  public getStats() {
    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.activeWorkers.size,
      queuedFrames: this.workerQueue.length,
      totalResults: this.results.length
    };
  }

  public terminate() {
    // Terminate all workers
    this.workers.forEach(worker => {
      worker.postMessage({ type: 'TERMINATE' });
      worker.terminate();
    });
    
    this.workers = [];
    this.activeWorkers.clear();
    this.workerQueue = [];
    this.results = [];
    this.isProcessing = false;
    
    console.log('Worker pool terminated');
  }
}

export default WorkerPoolManager; 