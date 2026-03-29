/**
 * AEROSCRIPT ML PREDICTION SERVICE
 * Combined utility for character and word recognition
 * 
 * Usage:
 *   import MLService from './mlService';
 *   const predictions = await MLService.predictCharacter(pixels);
 */

class MLService {
  constructor(apiUrl = '/api/ml', token = null) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  /**
   * Set authentication token
   * @param {string} token JWT token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Get authorization headers
   * @returns {Object} Headers object
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Predict character from 28×28 pixel image
   * @param {number[]} pixels Array of 784 grayscale values (0-1)
   * @returns {Promise<Array>} Top 5 predictions with confidence
   * @example
   *   const predictions = await MLService.predictCharacter(pixels);
   *   console.log(predictions[0]); // {character: 'A', confidence: 0.95}
   */
  async predictCharacter(pixels) {
    if (!Array.isArray(pixels) || pixels.length !== 784) {
      throw new Error('Character prediction requires 784 pixels (28×28)');
    }

    try {
      const response = await fetch(`${this.apiUrl}/predict`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ pixels }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Character prediction failed');
      }

      const data = await response.json();
      return data.predictions || [];
    } catch (error) {
      console.error('Character prediction error:', error);
      throw error;
    }
  }

  /**
   * Predict word from variable-sized pixel image
   * @param {number[]} pixels Array of width×height grayscale values (0-1)
   * @param {number} width Image width in pixels
   * @param {number} height Image height in pixels
   * @returns {Promise<Array>} Top 5 predictions with confidence
   * @example
   *   const predictions = await MLService.predictWord(pixels, 128, 48);
   *   console.log(predictions[0]); // {word: 'hello', confidence: 0.89}
   */
  async predictWord(pixels, width, height) {
    if (!Array.isArray(pixels) || pixels.length !== width * height) {
      throw new Error(`Word prediction requires ${width * height} pixels (${width}×${height})`);
    }

    try {
      const response = await fetch(`${this.apiUrl}/predict-word`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ pixels, width, height }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Word prediction failed');
      }

      const data = await response.json();
      return data.predictions || [];
    } catch (error) {
      console.error('Word prediction error:', error);
      throw error;
    }
  }

  /**
   * Batch predict characters (multiple images)
   * @param {number[][]} pixelArrays Array of pixel arrays
   * @returns {Promise<Array[]>} Array of prediction results
   */
  async predictCharacterBatch(pixelArrays) {
    const results = [];
    
    for (const pixels of pixelArrays) {
      try {
        const predictions = await this.predictCharacter(pixels);
        results.push({ success: true, predictions });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Batch predict words (multiple images)
   * @param {Array} imageData Array of {pixels, width, height}
   * @returns {Promise<Array>} Array of prediction results
   */
  async predictWordBatch(imageData) {
    const results = [];
    
    for (const { pixels, width, height } of imageData) {
      try {
        const predictions = await this.predictWord(pixels, width, height);
        results.push({ success: true, predictions });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Extract pixels from canvas
   * @param {CanvasRenderingContext2D} ctx Canvas context
   * @param {number} width Target width
   * @param {number} height Target height
   * @returns {number[]} Array of normalized grayscale pixels
   */
  static extractPixelsFromCanvas(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const pixels = [];

    // Convert RGBA to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Weighted grayscale conversion
      const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Weight by alpha
      const weighted = gray * (a / 255);
      pixels.push(weighted);
    }

    return pixels;
  }

  /**
   * Resize pixel array to new dimensions
   * @param {number[]} pixels Original pixel array
   * @param {number} origWidth Original width
   * @param {number} origHeight Original height
   * @param {number} newWidth Target width
   * @param {number} newHeight Target height
   * @returns {number[]} Resized pixel array
   */
  static resizePixels(pixels, origWidth, origHeight, newWidth, newHeight) {
    const resized = new Array(newWidth * newHeight).fill(0);
    const xRatio = origWidth / newWidth;
    const yRatio = origHeight / newHeight;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        const srcIdx = srcY * origWidth + srcX;
        const dstIdx = y * newWidth + x;
        
        if (srcIdx < pixels.length) {
          resized[dstIdx] = pixels[srcIdx];
        }
      }
    }

    return resized;
  }

  /**
   * Create canvas from pixels
   * @param {number[]} pixels Array of grayscale values
   * @param {number} width Width in pixels
   * @param {number} height Height in pixels
   * @returns {HTMLCanvasElement} Canvas element
   */
  static pixelsToCanvas(pixels, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < pixels.length; i++) {
      const gray = Math.round(pixels[i] * 255);
      const idx = i * 4;
      data[idx] = gray;     // R
      data[idx + 1] = gray; // G
      data[idx + 2] = gray; // B
      data[idx + 3] = 255;  // A
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
}

export default MLService;
