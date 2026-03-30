import React from 'react';
import { Palette } from 'lucide-react';

function SideColorPalette({ modeConfig, brushColor, setBrushColor }) {
  const extraColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#f8fafc', '#334155', '#000000', '#ffffff'
  ];

  return (
    <div className="side-color-palette">
      <div className="scp-header">
        <Palette size={12} className="text-cyan-400" />
        <span className="scp-title">Colors</span>
      </div>
      <div className="scp-grid">
        {modeConfig.colors.slice(0, 6).map((color) => (
          <button
            key={color}
            onClick={() => setBrushColor(color)}
            className={`scp-swatch ${brushColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="scp-divider" />
      <div className="scp-grid">
        {extraColors.map((color) => (
          <button
            key={color}
            onClick={() => setBrushColor(color)}
            className={`scp-swatch ${brushColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

export default SideColorPalette;
