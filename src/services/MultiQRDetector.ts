import jsQR from 'jsqr';

export interface DetectedCode {
  data: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  corners: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
}

export class MultiQRDetector {
  private static instance: MultiQRDetector;
  private processingQueue: ImageData[] = [];
  private isProcessing = false;

  static getInstance(): MultiQRDetector {
    if (!MultiQRDetector.instance) {
      MultiQRDetector.instance = new MultiQRDetector();
    }
    return MultiQRDetector.instance;
  }

  /**
   * Detect multiple QR codes in a single image frame
   * Uses advanced techniques to find multiple codes simultaneously
   */
  async detectMultipleCodes(imageData: ImageData): Promise<DetectedCode[]> {
    const codes: DetectedCode[] = [];
    const { data, width, height } = imageData;

    // Method 1: Full image scan
    const fullScanResult = jsQR(data, width, height);
    if (fullScanResult) {
      codes.push(this.createDetectedCode(fullScanResult));
    }

    // Method 2: Region-based scanning for multiple codes
    const regionCodes = await this.scanRegions(imageData);
    codes.push(...regionCodes);

    // Method 3: Multi-scale scanning
    const scaleCodes = await this.scanMultipleScales(imageData);
    codes.push(...scaleCodes);

    // Remove duplicates based on content and position
    return this.removeDuplicateCodes(codes);
  }

  /**
   * Scan different regions of the image to find multiple codes
   */
  private async scanRegions(imageData: ImageData): Promise<DetectedCode[]> {
    const codes: DetectedCode[] = [];
    const { width, height } = imageData;

    // Define regions to scan (quadrants, center, etc.)
    const regions = [
      { x: 0, y: 0, w: width / 2, h: height / 2 }, // Top-left
      { x: width / 2, y: 0, w: width / 2, h: height / 2 }, // Top-right
      { x: 0, y: height / 2, w: width / 2, h: height / 2 }, // Bottom-left
      { x: width / 2, y: height / 2, w: width / 2, h: height / 2 }, // Bottom-right
      { x: width / 4, y: height / 4, w: width / 2, h: height / 2 }, // Center
    ];

    for (const region of regions) {
      try {
        const regionData = this.extractRegion(imageData, region);
        const result = jsQR(regionData.data, regionData.width, regionData.height);
        
        if (result) {
          // Adjust coordinates to original image space
          const adjustedCode = this.createDetectedCode(result, region.x, region.y);
          codes.push(adjustedCode);
        }
      } catch (error) {
        console.warn('Region scan failed:', error);
      }
    }

    return codes;
  }

  /**
   * Scan the image at multiple scales to detect codes of different sizes
   */
  private async scanMultipleScales(imageData: ImageData): Promise<DetectedCode[]> {
    const codes: DetectedCode[] = [];
    const scales = [0.5, 0.75, 1.0, 1.25, 1.5];

    for (const scale of scales) {
      try {
        const scaledData = this.scaleImageData(imageData, scale);
        const result = jsQR(scaledData.data, scaledData.width, scaledData.height);
        
        if (result) {
          // Adjust coordinates back to original scale
          const adjustedCode = this.createDetectedCode(result, 0, 0, 1 / scale);
          codes.push(adjustedCode);
        }
      } catch (error) {
        console.warn('Scale scan failed:', error);
      }
    }

    return codes;
  }

  /**
   * Extract a region from the image data
   */
  private extractRegion(imageData: ImageData, region: { x: number; y: number; w: number; h: number }): ImageData {
    const { data, width } = imageData;
    const newData = new Uint8ClampedArray(region.w * region.h * 4);

    for (let y = 0; y < region.h; y++) {
      for (let x = 0; x < region.w; x++) {
        const srcIndex = ((region.y + y) * width + (region.x + x)) * 4;
        const dstIndex = (y * region.w + x) * 4;
        
        newData[dstIndex] = data[srcIndex]; // R
        newData[dstIndex + 1] = data[srcIndex + 1]; // G
        newData[dstIndex + 2] = data[srcIndex + 2]; // B
        newData[dstIndex + 3] = data[srcIndex + 3]; // A
      }
    }

    return new ImageData(newData, region.w, region.h);
  }

  /**
   * Scale image data for multi-scale detection
   */
  private scaleImageData(imageData: ImageData, scale: number): ImageData {
    const { data, width, height } = imageData;
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);
    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x / scale);
        const srcY = Math.floor(y / scale);
        const srcIndex = (srcY * width + srcX) * 4;
        const dstIndex = (y * newWidth + x) * 4;
        
        newData[dstIndex] = data[srcIndex];
        newData[dstIndex + 1] = data[srcIndex + 1];
        newData[dstIndex + 2] = data[srcIndex + 2];
        newData[dstIndex + 3] = data[srcIndex + 3];
      }
    }

    return new ImageData(newData, newWidth, newHeight);
  }

  /**
   * Create a DetectedCode object from jsQR result
   */
  private createDetectedCode(
    result: any, 
    offsetX: number = 0, 
    offsetY: number = 0, 
    scale: number = 1
  ): DetectedCode {
    const corners = result.location;
    
    return {
      data: result.data,
      confidence: result.confidence || 1.0,
      boundingBox: {
        x: (corners.topLeftCorner.x * scale) + offsetX,
        y: (corners.topLeftCorner.y * scale) + offsetY,
        width: (corners.bottomRightCorner.x - corners.topLeftCorner.x) * scale,
        height: (corners.bottomRightCorner.y - corners.topLeftCorner.y) * scale,
      },
      corners: {
        topLeft: {
          x: (corners.topLeftCorner.x * scale) + offsetX,
          y: (corners.topLeftCorner.y * scale) + offsetY,
        },
        topRight: {
          x: (corners.topRightCorner.x * scale) + offsetX,
          y: (corners.topRightCorner.y * scale) + offsetY,
        },
        bottomLeft: {
          x: (corners.bottomLeftCorner.x * scale) + offsetX,
          y: (corners.bottomLeftCorner.y * scale) + offsetY,
        },
        bottomRight: {
          x: (corners.bottomRightCorner.x * scale) + offsetX,
          y: (corners.bottomRightCorner.y * scale) + offsetY,
        },
      },
    };
  }

  /**
   * Remove duplicate codes based on content and position
   */
  private removeDuplicateCodes(codes: DetectedCode[]): DetectedCode[] {
    const uniqueCodes: DetectedCode[] = [];
    const seenData = new Set<string>();
    const seenPositions = new Set<string>();

    for (const code of codes) {
      const dataKey = code.data;
      const positionKey = `${Math.round(code.boundingBox.x / 10)}-${Math.round(code.boundingBox.y / 10)}`;

      // Check if we've seen this data or position before
      if (!seenData.has(dataKey) && !seenPositions.has(positionKey)) {
        uniqueCodes.push(code);
        seenData.add(dataKey);
        seenPositions.add(positionKey);
      }
    }

    return uniqueCodes;
  }

  /**
   * Process frame with performance optimization
   */
  async processFrameOptimized(imageData: ImageData): Promise<DetectedCode[]> {
    // Add to processing queue
    this.processingQueue.push(imageData);

    // If already processing, return empty array
    if (this.isProcessing) {
      return [];
    }

    this.isProcessing = true;

    try {
      // Process the most recent frame
      const latestFrame = this.processingQueue.pop();
      this.processingQueue = []; // Clear queue

      if (latestFrame) {
        return await this.detectMultipleCodes(latestFrame);
      }

      return [];
    } finally {
      this.isProcessing = false;
    }
  }
}

export default MultiQRDetector; 