/**
 * Export Service for Aeroscript
 * Handles exporting canvas drawings to PDF, PNG, and JPG formats
 */

export const EXPORT_FORMATS = {
  PNG: 'png',
  JPG: 'jpg',
  PDF: 'pdf'
};

export const EXPORT_SIZES = {
  SMALL: { width: 512, height: 512, label: 'Small (512×512)' },
  MEDIUM: { width: 1024, height: 1024, label: 'Medium (1024×1024)' },
  LARGE: { width: 2048, height: 2048, label: 'Large (2048×2048)' },
  A4: { width: 2100, height: 2970, label: 'A4 (2100×2970)' },
  CUSTOM: { width: null, height: null, label: 'Custom' }
};

export const FILE_SIZES = {
  SIZE_50KB: { kb: 50, label: '50 KB' },
  SIZE_100KB: { kb: 100, label: '100 KB' },
  SIZE_250KB: { kb: 250, label: '250 KB' },
  SIZE_500KB: { kb: 500, label: '500 KB' },
  SIZE_1MB: { kb: 1024, label: '1 MB' },
  SIZE_2MB: { kb: 2048, label: '2 MB' },
  SIZE_5MB: { kb: 5120, label: '5 MB' },
  SIZE_10MB: { kb: 10240, label: '10 MB' },
  SIZE_20MB: { kb: 20480, label: '20 MB' },
};

/**
 * Validate canvas element
 */
const validateCanvas = (canvas) => {
  if (!canvas) {
    throw new Error('Canvas element is null or undefined');
  }
  
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`Invalid canvas type: expected HTMLCanvasElement, got ${typeof canvas}`);
  }
  
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Canvas has invalid dimensions (0 width or height)');
  }
  
  return true;
};

/**
 * Estimate pixel dimensions based on target file size
 * This is an approximation - actual size depends on image content and compression
 */
export const estimateDimensionsFromFileSize = (targetSizeKB, format = 'png') => {
  // Rough estimation: PNG is roughly 3 bytes per pixel, JPG is roughly 1 byte per pixel
  const bytesPerPixel = format === 'jpg' ? 1 : 3;
  const targetBytes = targetSizeKB * 1024;
  const estimatedPixels = targetBytes / bytesPerPixel;
  
  // Assume square or 4:3 aspect ratio
  const side = Math.round(Math.sqrt(estimatedPixels));
  
  // Round to nearest power of 2 or common size
  const commonSizes = [256, 512, 768, 1024, 1280, 1536, 1920, 2048, 2560, 3072, 4096];
  let finalSize = commonSizes.find(s => s >= side) || side;
  
  return { width: finalSize, height: finalSize };
};

/**
 * Resize canvas to target dimensions while maintaining content
 */
const resizeCanvasContent = (canvas, targetWidth, targetHeight) => {
  validateCanvas(canvas);
  
  const newCanvas = document.createElement('canvas');
  newCanvas.width = targetWidth;
  newCanvas.height = targetHeight;
  
  const ctx = newCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }
  
  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  
  // Calculate scaling to fit content
  const scale = Math.min(
    targetWidth / canvas.width,
    targetHeight / canvas.height,
    1 // Don't upscale
  );
  
  const scaledWidth = canvas.width * scale;
  const scaledHeight = canvas.height * scale;
  const x = (targetWidth - scaledWidth) / 2;
  const y = (targetHeight - scaledHeight) / 2;
  
  try {
    ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
  } catch (error) {
    throw new Error(`Failed to draw image on canvas: ${error.message}`);
  }
  
  return newCanvas;
};

/**
 * Export canvas to PNG
 */
export const exportToPNG = (canvas, filename, size = EXPORT_SIZES.MEDIUM) => {
  try {
    validateCanvas(canvas);
    
    const targetCanvas = size.width && size.height 
      ? resizeCanvasContent(canvas, size.width, size.height)
      : canvas;
    
    targetCanvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
    
    return { success: true, message: 'PNG exported successfully' };
  } catch (error) {
    console.error('PNG export error:', error);
    return { success: false, message: `PNG export failed: ${error.message}` };
  }
};

/**
 * Export canvas to JPG
 */
export const exportToJPG = (canvas, filename, size = EXPORT_SIZES.MEDIUM, quality = 0.95) => {
  try {
    validateCanvas(canvas);
    
    const targetCanvas = size.width && size.height
      ? resizeCanvasContent(canvas, size.width, size.height)
      : canvas;
    
    targetCanvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', quality);
    
    return { success: true, message: 'JPG exported successfully' };
  } catch (error) {
    console.error('JPG export error:', error);
    return { success: false, message: `JPG export failed: ${error.message}` };
  }
};

/**
 * Export canvas to PDF
 * Requires jsPDF library (should be installed via npm)
 */
export const exportToPDF = async (canvas, filename, size = EXPORT_SIZES.A4) => {
  try {
    validateCanvas(canvas);
    
    // Import jsPDF dynamically
    const { jsPDF } = window.jspdf || await import('jspdf').then(m => m);
    
    if (!jsPDF) {
      throw new Error('jsPDF library not found. Please install it via: npm install jspdf');
    }
    
    // Create PDF with custom dimensions
    const pdfWidth = size.width || 210; // mm (A4 width)
    const pdfHeight = size.height || 297; // mm (A4 height)
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });
    
    // Resize canvas content
    const targetCanvas = resizeCanvasContent(
      canvas,
      size.width || canvas.width,
      size.height || canvas.height
    );
    
    // Convert canvas to image
    const imgData = targetCanvas.toDataURL('image/png');
    
    // Calculate dimensions to fit in PDF
    const imgWidth = pdfWidth * 0.9; // 90% of page width
    const imgHeight = (imgWidth * targetCanvas.height) / targetCanvas.width;
    const x = (pdfWidth - imgWidth) / 2; // Center horizontally
    const y = (pdfHeight - imgHeight) / 2; // Center vertically
    
    // Add image to PDF
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    
    // Save PDF
    pdf.save(`${filename}.pdf`);
    
    return { success: true, message: 'PDF exported successfully' };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, message: `PDF export failed: ${error.message}` };
  }
};

/**
 * Generic export function
 */
export const exportDrawing = (canvas, filename, format, size, quality) => {
  if (!canvas) {
    return { success: false, message: 'Canvas element is missing or not rendered' };
  }
  
  if (!(canvas instanceof HTMLCanvasElement)) {
    return { success: false, message: `Expected canvas element, but received ${typeof canvas}. Check that canvasRef.current points to the actual HTML canvas element.` };
  }
  
  if (canvas.width === 0 || canvas.height === 0) {
    return { success: false, message: 'Canvas has no content (width or height is 0). Please draw something first.' };
  }
  
  if (!filename || filename.trim() === '') {
    filename = `drawing_${new Date().getTime()}`;
  }
  
  switch (format) {
    case EXPORT_FORMATS.PNG:
      return exportToPNG(canvas, filename, size);
    case EXPORT_FORMATS.JPG:
      return exportToJPG(canvas, filename, size, quality);
    case EXPORT_FORMATS.PDF:
      return exportToPDF(canvas, filename, size);
    default:
      return { success: false, message: 'Unknown export format' };
  }
};
