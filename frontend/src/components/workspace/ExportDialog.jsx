import React, { useState } from 'react';
import { Download } from 'lucide-react';
import ModalShell from './ModalShell';
import { exportDrawing, EXPORT_FORMATS, EXPORT_SIZES, FILE_SIZES, estimateDimensionsFromFileSize } from '../../services/exportService';

function ExportDialog({ isOpen, onClose, canvasRef, filename = '' }) {
  const [selectedFormat, setSelectedFormat] = useState(EXPORT_FORMATS.PNG);
  const [selectedSize, setSelectedSize] = useState(EXPORT_SIZES.MEDIUM);
  const [selectedFileSize, setSelectedFileSize] = useState(null);
  const [useFileSize, setUseFileSize] = useState(false);
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

    const actualCanvas = canvasRef.current.getCanvas ? canvasRef.current.getCanvas() : canvasRef.current;
    
    if (!actualCanvas) {
      alert('Canvas element not available');
      return;
    }

    setExporting(true);

    try {
      let size;
      if (useFileSize && selectedFileSize) {
        const format = selectedFormat === EXPORT_FORMATS.PNG ? 'png' : 'jpg';
        size = estimateDimensionsFromFileSize(selectedFileSize.kb, format);
      } else if (selectedSize.width === null) {
        size = { width: customWidth, height: customHeight };
      } else {
        size = selectedSize;
      }

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

  return (
    <ModalShell
      isOpen={isOpen}
      title="Export Drawing"
      description="Export your drawing in your preferred format and size."
      onClose={onClose}
      size="md"
      showHeader={false}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Export Drawing</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filename
          </label>
          <input
            type="text"
            value={pdfName}
            onChange={(e) => setPdfName(e.target.value)}
            placeholder="Enter filename"
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-cyan-400/40 focus:bg-white/8 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(EXPORT_FORMATS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setSelectedFormat(value)}
                className={`py-2 px-3 rounded-xl font-medium uppercase text-xs transition-all ${
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

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Size
          </label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setUseFileSize(false)}
              className={`flex-1 py-2 px-3 rounded-xl font-medium text-xs transition-all ${
                !useFileSize
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-black/30 border border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              By Dimensions
            </button>
            <button
              onClick={() => setUseFileSize(true)}
              className={`flex-1 py-2 px-3 rounded-xl font-medium text-xs transition-all ${
                useFileSize
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-black/30 border border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              By File Size
            </button>
          </div>
          
          {useFileSize ? (
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(FILE_SIZES).map(([key, size]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFileSize(size)}
                  className={`py-2 px-2 rounded-xl font-medium text-xs transition-all ${
                    selectedFileSize?.kb === size.kb
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                      : 'bg-black/30 border border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={selectedSize === EXPORT_SIZES.CUSTOM ? 'custom' : Object.keys(EXPORT_SIZES).find(k => EXPORT_SIZES[k] === selectedSize)}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setSelectedSize(EXPORT_SIZES.CUSTOM);
                } else {
                  setSelectedSize(EXPORT_SIZES[e.target.value]);
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400/40 outline-none transition"
            >
              {Object.entries(EXPORT_SIZES).map(([key, size]) => (
                <option key={key} value={key}>
                  {size.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedSize === EXPORT_SIZES.CUSTOM && !useFileSize && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Width (px)
              </label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(Math.max(100, parseInt(e.target.value) || 1024))}
                min="100"
                step="100"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-400/40 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Height (px)
              </label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(Math.max(100, parseInt(e.target.value) || 1024))}
                min="100"
                step="100"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-400/40 outline-none transition"
              />
            </div>
          </div>
        )}

        {selectedFormat === EXPORT_FORMATS.JPG && (
          <div>
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
              className="w-full h-2 rounded-lg bg-white/5 border border-white/10 accent-cyan-500"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Your drawing will be saved to your Downloads folder
        </p>
      </div>
    </ModalShell>
  );
}

export default ExportDialog;
