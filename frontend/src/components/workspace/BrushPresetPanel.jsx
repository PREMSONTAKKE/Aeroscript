import React, { useState, useEffect, useCallback } from 'react';
import { Save, Trash2, Plus, X, Sliders, Palette } from 'lucide-react';
import { brushPresetsApi } from '../../services/presetsApi';
import { useAuth } from '../../context/AuthContext';
import ModalShell from './ModalShell';

const DEFAULT_BRUSH_SETTINGS = {
  color: '#e2e8f0',
  width: 4,
  inkType: 'Graphite',
  opacity: 1,
};

const DEFAULT_EFFECTS = {
  smoothing: 0.5,
  pressureSensitivity: 0,
  tiltSensitivity: 0,
};

export default function BrushPresetPanel({ 
  isOpen, 
  onClose, 
  currentSettings,
  onApplyPreset 
}) {
  const { user } = useAuth();
  const [presets, setPresets] = useState([]);
  const [stylePresets, setStylePresets] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPreset, setNewPreset] = useState({
    name: '',
    brush: { ...DEFAULT_BRUSH_SETTINGS },
    effects: { ...DEFAULT_EFFECTS },
    isPublic: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPresets = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const { presets } = await brushPresetsApi.getAll(user.token);
      setPresets(presets || []);
    } catch (err) {
      setError('Failed to load presets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const loadStylePresets = useCallback(async () => {
    try {
      const { presets } = await brushPresetsApi.getStylePresets();
      setStylePresets(presets || []);
    } catch (err) {
      console.error('Failed to load style presets:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen && user?.token) {
      loadPresets();
    }
  }, [isOpen, user?.token, loadPresets]);

  useEffect(() => {
    if (isOpen) {
      loadStylePresets();
    }
  }, [isOpen, loadStylePresets]);

  const handleCreatePreset = async () => {
    if (!newPreset.name.trim()) {
      setError('Preset name is required');
      return;
    }

    if (!user?.token) return;
    
    setLoading(true);
    setError(null);
    try {
      const { preset } = await brushPresetsApi.create(user.token, newPreset);
      setPresets(prev => [preset, ...prev]);
      setShowCreateModal(false);
      setNewPreset({
        name: '',
        brush: { ...DEFAULT_BRUSH_SETTINGS },
        effects: { ...DEFAULT_EFFECTS },
        isPublic: false,
      });
    } catch (err) {
      setError(err.message || 'Failed to create preset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (id) => {
    if (!user?.token) return;
    
    try {
      await brushPresetsApi.delete(user.token, id);
      setPresets(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      setError('Failed to delete preset');
      console.error(err);
    }
  };

  const handleApplyPreset = async (preset) => {
    if (onApplyPreset) {
      onApplyPreset({
        brushColor: preset.brush.color,
        width: preset.brush.width,
        inkType: preset.brush.inkType,
      });
    }
    
    if (user?.token) {
      try {
        await brushPresetsApi.use(user.token, preset._id);
      } catch (err) {
        console.error('Failed to track preset usage:', err);
      }
    }
  };

  const handleSaveCurrentAsPreset = () => {
    if (currentSettings) {
      setNewPreset({
        name: '',
        brush: {
          color: currentSettings.color || currentSettings.brushColor || DEFAULT_BRUSH_SETTINGS.color,
          width: currentSettings.width || currentSettings.brushWidth || DEFAULT_BRUSH_SETTINGS.width,
          inkType: currentSettings.inkType || DEFAULT_BRUSH_SETTINGS.inkType,
          opacity: 1,
        },
        effects: { ...DEFAULT_EFFECTS },
        isPublic: false,
      });
    }
    setShowCreateModal(true);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      showHeader={false}
      className="max-h-[85vh] flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-white/10 p-4 -mx-6 -mt-6 mb-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-2">
            <Sliders size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Brush Presets</h2>
            <p className="text-xs text-slate-400">Save and apply custom brush configurations</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'my'
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Presets
          </button>
          <button
            onClick={() => setActiveTab('styles')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'styles'
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Style Presets
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {activeTab === 'my' && (
            <>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-4 text-cyan-400 transition hover:bg-cyan-500/10"
                >
                  <Plus size={20} className="mx-auto mb-1" />
                  <span className="text-sm">New Preset</span>
                </button>
                <button
                  onClick={handleSaveCurrentAsPreset}
                  className="flex-1 rounded-xl border border-dashed border-purple-500/30 bg-purple-500/5 p-4 text-purple-400 transition hover:bg-purple-500/10"
                >
                  <Save size={20} className="mx-auto mb-1" />
                  <span className="text-sm">Save Current</span>
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                </div>
              ) : presets.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Palette size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No presets yet</p>
                  <p className="text-sm">Create your first preset above</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {presets.map((preset) => (
                    <div
                      key={preset._id}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-500/30"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white">{preset.name}</h3>
                          <p className="text-xs text-slate-400 capitalize">{preset.category}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => handleDeletePreset(preset._id)}
                            className="rounded-lg bg-red-500/20 p-1.5 text-red-400 transition hover:bg-red-500/30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg border border-white/20"
                          style={{ backgroundColor: preset.brush.color }}
                        />
                        <div className="text-xs text-slate-400">
                          <span className="font-medium text-white">{preset.brush.width}px</span>
                          <span className="mx-1">·</span>
                          <span>{preset.brush.inkType}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyPreset(preset)}
                        className="w-full rounded-lg bg-cyan-500/20 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/30"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'styles' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {stylePresets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 p-4 transition hover:border-purple-500/30"
                >
                  <div className="mb-2">
                    <h3 className="font-medium text-white">{preset.name}</h3>
                    <p className="text-xs text-slate-400 capitalize">{preset.type}</p>
                  </div>
                  
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg border border-white/20"
                      style={{ backgroundColor: preset.brush.color }}
                    />
                    <div className="text-xs text-slate-400">
                      <span className="font-medium text-white">{preset.brush.width}px</span>
                      <span className="mx-1">·</span>
                      <span>{preset.brush.inkType}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {Object.entries(preset.effects).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleApplyPreset({ brush: preset.brush })}
                    className="mt-3 w-full rounded-lg bg-purple-500/20 py-2 text-sm font-medium text-purple-400 transition hover:bg-purple-500/30"
                  >
                    Apply Style
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0a0f1a]">
            <h3 className="mb-4 text-sm font-medium text-slate-800 dark:text-white">Create New Preset</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Preset Name</label>
                <input
                  type="text"
                  value={newPreset.name}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Custom Brush"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newPreset.brush.color}
                      onChange={(e) => setNewPreset(prev => ({ 
                        ...prev, 
                        brush: { ...prev.brush, color: e.target.value }
                      }))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-transparent dark:border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Width</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newPreset.brush.width}
                    onChange={(e) => setNewPreset(prev => ({ 
                      ...prev, 
                      brush: { ...prev.brush, width: parseInt(e.target.value) || 4 }
                    }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Ink Type</label>
                  <select
                    value={newPreset.brush.inkType}
                    onChange={(e) => setNewPreset(prev => ({ 
                      ...prev, 
                      brush: { ...prev.brush, inkType: e.target.value }
                    }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="Graphite">Graphite</option>
                    <option value="Pencil">Pencil</option>
                    <option value="Laser">Laser</option>
                    <option value="Calligraphy">Calligraphy</option>
                    <option value="Marker">Marker</option>
                    <option value="Neon">Neon</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={newPreset.isPublic}
                    onChange={(e) => setNewPreset(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500 dark:border-white/20 dark:bg-white/5"
                  />
                  Make public
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePreset}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-cyan-500 py-2 text-sm font-medium text-black transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Preset'}
                </button>
              </div>
            </div>
            </div>
          )}
    </ModalShell>
  );
}
