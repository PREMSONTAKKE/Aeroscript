import React, { useState } from 'react';
import { HelpCircle, MousePointer2, Hand, PenTool, Palette, Type, Camera, Download, Save, Users, Keyboard, Layers, Eraser, Undo2, Redo2, Settings } from 'lucide-react';
import ModalShell from './ModalShell';

const SECTIONS = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: HelpCircle,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'modes',
    label: 'Drawing Modes',
    icon: Layers,
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'input',
    label: 'Input Methods',
    icon: MousePointer2,
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'features',
    label: 'Features',
    icon: Settings,
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    icon: Keyboard,
    color: 'from-red-500 to-rose-500'
  }
];

const GettingStartedContent = () => (
  <div className="space-y-5">
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
        <Layers size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Choose a Drawing Mode</h4>
        <p className="mt-1 text-sm text-slate-400">Select from three modes on the landing page. Signature is optimized for signatures, Draw for freehand drawing, and Write for handwriting recognition.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
        <MousePointer2 size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Draw on the Canvas</h4>
        <p className="mt-1 text-sm text-slate-400">Use your mouse, touchpad, or touchscreen to draw on the workspace. Your strokes appear in real-time with smooth, responsive ink effects.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
        <Save size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Save Your Work</h4>
        <p className="mt-1 text-sm text-slate-400">Click the Save button to store your session. You can load previous sessions from the History sidebar (Ctrl+H).</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
        <Download size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Export Your Art</h4>
        <p className="mt-1 text-sm text-slate-400">Export your canvas as PNG, JPG, or PDF using the Export button in the bottom toolbar.</p>
      </div>
    </div>
  </div>
);

const ModesContent = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
        <PenTool size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Signature Mode</h4>
        <p className="mt-1 text-sm text-slate-400">Professional signing suite with optimized brush styles for elegant digital signatures. Uses fine-point graphite and smooth ink flow. Best for: legal documents, verification forms.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
        <Palette size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Draw Mode</h4>
        <p className="mt-1 text-sm text-slate-400">Full-spectrum creative studio with diverse brush types, multiple ink styles (Graphite, Ink, Marker, Highlighter, Calligraphy, Watercolor), and high-fidelity kinetic response. Best for: sketching, illustrations, diagrams.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
        <Type size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Write Mode</h4>
        <p className="mt-1 text-sm text-slate-400">AI-enhanced writing environment with handwriting recognition and character prediction. As you write, the system provides AI-powered character suggestions. Best for: note-taking, handwriting practice, letter writing.</p>
      </div>
    </div>
  </div>
);

const InputContent = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
        <MousePointer2 size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Mouse / Touchpad</h4>
        <p className="mt-1 text-sm text-slate-400">Click and drag to draw. Supports high-DPI displays for smooth, precise strokes. Select "Mouse/Touchpad" from the input mode selector.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
        <Settings size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Touch Screen</h4>
        <p className="mt-1 text-sm text-slate-400">Draw directly on your touchscreen with your finger or stylus. Select "Touch Screen" from the input mode selector for palm rejection and pressure sensitivity.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
        <Hand size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Hand Tracking (Camera)</h4>
        <p className="mt-1 text-sm text-slate-400">Draw using just your hand in front of the webcam. Click the <strong className="text-emerald-400">Hand button</strong> in the bottom toolbar to enable camera mode.</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 font-bold">1</div>
            <span>Point with your <strong>index finger</strong> — this acts as your cursor</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/20 text-cyan-400 font-bold">2</div>
            <span>When the cursor turns <strong className="text-cyan-400">cyan</strong>, you're ready to draw</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/20 text-purple-400 font-bold">3</div>
            <span>Hold your index finger down to draw — moving your hand creates strokes</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-amber-400 font-bold">4</div>
            <span>Show <strong>multiple fingers</strong> to stop drawing and move the cursor freely</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-red-500/20 text-red-400 font-bold">5</div>
            <span>Hide your hand from camera to <strong>stop cursor movement</strong> entirely</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FeaturesContent = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
        <Users size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Party Mode (Collaboration)</h4>
        <p className="mt-1 text-sm text-slate-400">Real-time collaborative drawing with friends. Click the Party button to create or join a party. Share the party code with others to draw together on the same canvas. Each collaborator sees others' cursors in real-time.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
        <Camera size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Brush Customization</h4>
        <p className="mt-1 text-sm text-slate-400">Click the Top Controls toggle (hamburger menu) to access brush settings. Change ink type, color, and brush width. Preset configurations can be saved and shared in Party mode.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
        <Undo2 size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">Undo / Redo</h4>
        <p className="mt-1 text-sm text-slate-400">Made a mistake? Use the Undo and Redo buttons in the bottom toolbar to step through your drawing history.</p>
      </div>
    </div>

    <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
        <Eraser size={18} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-white">New Canvas</h4>
        <p className="mt-1 text-sm text-slate-400">Click the Erase (X) button to clear the canvas and start fresh. You'll be prompted if you have unsaved changes.</p>
      </div>
    </div>
  </div>
);

const ShortcutsContent = () => {
  const shortcuts = [
    { keys: ['Ctrl', 'H'], action: 'Toggle History sidebar' },
    { keys: ['Ctrl', 'M'], action: 'Toggle Modes sidebar' },
    { keys: ['Esc'], action: 'Close panels and modals' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Quick keyboard shortcuts to speed up your workflow:</p>
      <div className="space-y-2">
        {shortcuts.map(({ keys, action }) => (
          <div key={action} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-300">{action}</span>
            <div className="flex items-center gap-1.5">
              {keys.map((key) => (
                <kbd key={key} className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">More shortcuts coming in future updates.</p>
    </div>
  );
};

const CONTENT_MAP = {
  'getting-started': <GettingStartedContent />,
  'modes': <ModesContent />,
  'input': <InputContent />,
  'features': <FeaturesContent />,
  'shortcuts': <ShortcutsContent />
};

function TutorialModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState('getting-started');

  return (
    <ModalShell
      isOpen={isOpen}
      title="How to Use Aeroscript"
      description="A complete guide to all features and tools"
      onClose={onClose}
      size="2xl"
      zIndex="z-[200]"
      showHeader={true}
      className="max-h-[80vh] flex flex-col"
    >
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-5">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
              activeSection === section.id
                ? `bg-gradient-to-br ${section.color} text-white shadow-lg`
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <section.icon size={14} />
            <span className="hidden sm:inline">{section.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {CONTENT_MAP[activeSection]}
      </div>
    </ModalShell>
  );
}

export default TutorialModal;
