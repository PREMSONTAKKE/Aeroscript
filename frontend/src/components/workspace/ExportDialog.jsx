import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { exportDrawing, EXPORT_FORMATS, EXPORT_SIZES } from '../../services/exportService';

function ExportDialog({ isOpen, onClose, canvasRef, filename = '' }) {
  const [selectedFormat, setSelectedFormat] = useState(EXPORT_FORMATS.PNG);
  const [selectedSize, setSelectedSize] = useState(EXPORT_SIZES.MEDIUM);
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);
  const [jpgQuality, setJpgQuality] = useState(95);
  const [exporting, setExporting] = useState(false);
  const [pdfName, setPdfName] = useState(filename || `drawing_${new Date().getTime()}`);

  const handleExport = async () => {
    if (!canvasRef?.current) {
      alert('Canvas not found');
      return;
    }

    // Get the actual canvas element from AeroCanvas
    const actualCanvas = canvasRef.current.getCanvas ? canvasRef.current.getCanvas() : canvasRef.current;
    
    if (!actualCanvas) {
      alert('Canvas element not available');
      return;
    }

    setExporting(true);

    try {
      const size = selectedSize.width === null
        ? { width: customWidth, height: customHeight }
        : selectedSize;

      const result = await exportDrawing(
        actualCanvas,
        pdfName,
        selectedFormat,
        size,
        jpgQuality / 100
      );

      if (result.success) {
        alert(result.message);
        onClose();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Export failed: ${error.message}`);
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Export Drawing</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filename */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filename
          </label>
          <input
            type="text"
            value={pdfName}
            onChange={(e) => setPdfName(e.target.value)}
            placeholder="Enter filename"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(EXPORT_FORMATS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setSelectedFormat(value)}
                className={`py-2 px-3 rounded-lg font-medium uppercase text-xs transition-all ${
                  selectedFormat === value
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-black/30 border border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Size
          </label>
          <select
            value={selectedSize === EXPORT_SIZES.CUSTOM ? 'custom' : Object.keys(EXPORT_SIZES).find(k => EXPORT_SIZES[k] === selectedSize)}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setSelectedSize(EXPORT_SIZES.CUSTOM);
              } else {
                setSelectedSize(EXPORT_SIZES[e.target.value]);
              }
            }}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {Object.entries(EXPORT_SIZES).map(([key, size]) => (
              <option key={key} value={key}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Size Inputs */}
        {selectedSize === EXPORT_SIZES.CUSTOM && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Width (px)
              </label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(Math.max(100, parseInt(e.target.value) || 1024))}
                min="100"
                step="100"
                className="w-full px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Height (px)
              </label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(Math.max(100, parseInt(e.target.value) || 1024))}
                min="100"
                step="100"
                className="w-full px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {/* JPG Quality */}
        {selectedFormat === EXPORT_FORMATS.JPG && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Quality
              </label>
              <span className="text-sm font-semibold text-cyan-400">{jpgQuality}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={jpgQuality}
              onChange={(e) => setJpgQuality(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg bg-black/30 border border-white/10 accent-cyan-500"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 py-2 px-4 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-slate-400 mt-4 text-center">
          Your drawing will be saved to your Downloads folder
        </p>
      </div>
    </div>
  );
}

export default ExportDialog;
