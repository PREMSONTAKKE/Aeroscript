import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PenTool, Palette, Type, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CursorTrail from '../components/AeroCanvas/CursorTrail';

const MotionDiv = motion.div;
const MotionHeading = motion.h2;
const MotionParagraph = motion.p;
const STAR_POSITIONS = Array.from({ length: 30 }, () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 5}s`
}));

const ModeCard = ({ title, description, icon: Icon, mode, onClick, colorClass }) => (
  <MotionDiv
    whileHover={{ y: -10, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onClick(mode)}
    className="relative group cursor-pointer"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-10 group-hover:opacity-20 transition-opacity rounded-[32px] blur-xl`} />
    <div className="relative glass-panel p-8 rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-3xl h-full flex flex-col items-center text-center">
      <div className={`p-6 rounded-2xl bg-white/5 ${colorClass.split(' ')[1]} mb-6`}>
        {React.createElement(Icon, { size: 40 })}
      </div>
      <h3 className="text-2xl font-bold text-white mb-2 tracking-wide uppercase">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6">
        {description}
      </p>
      <div className="mt-auto px-6 py-2 rounded-full border border-white/10 text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-white group-hover:border-white/20 transition-colors">
        Enter Workspace
      </div>
    </div>
  </MotionDiv>
);

const LandingView = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleModeSelect = (mode) => {
    navigate(`/workspace/${mode}`);
  };

  const modes = [
    {
      title: 'Signature',
      description: 'Professional suite with optimized brush styles for elegant digital signatures and verification.',
      icon: PenTool,
      mode: 'signature',
      colorClass: 'from-blue-500 to-cyan-500 text-blue-400'
    },
    {
      title: 'Draw',
      description: 'Full-spectrum creative studio with diverse brush types and high-fidelity kinetic response.',
      icon: Palette,
      mode: 'draw',
      colorClass: 'from-purple-500 to-pink-500 text-purple-400'
    },
    {
      title: 'Write',
      description: 'AI-enhanced writing environment with character recognition and predictive intelligence.',
      icon: Type,
      mode: 'write',
      colorClass: 'from-emerald-500 to-teal-500 text-emerald-400'
    }
  ];

  return (
    <div className="min-h-screen bg-[#06080d] flex flex-col items-center p-8 relative overflow-hidden font-sans">
      <CursorTrail />
      
      {/* Background Star Effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {STAR_POSITIONS.map((star, i) => (
          <div key={i} className="star animate-pulse" style={{
            top: star.top,
            left: star.left,
            animationDelay: star.animationDelay,
            position: 'absolute',
            width: '2px',
            height: '2px',
            backgroundColor: 'white',
            borderRadius: '50%'
          }} />
        ))}
      </div>

      <header className="w-full max-w-7xl flex justify-between items-center mb-16 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            A
          </div>
          <span className="text-xl font-bold tracking-widest text-white uppercase">AeroScript</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Authorized User</span>
            <span className="text-sm text-slate-200">{user?.email}</span>
          </div>
          <button 
            onClick={logout}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl flex flex-col items-center justify-center relative z-10">
        <div className="text-center mb-16">
          <MotionHeading 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-bold text-white mb-4 tracking-tight"
          >
            Select Your Workspace
          </MotionHeading>
          <MotionParagraph 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-xl mx-auto"
          >
            Choose a specialized mode to begin. Your data and tools will be isolated for a distraction-free experience.
          </MotionParagraph>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {modes.map((mode, index) => (
            <MotionDiv
              key={mode.mode}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <ModeCard {...mode} onClick={handleModeSelect} />
            </MotionDiv>
          ))}
        </div>
      </main>

      <footer className="mt-16 text-slate-700 text-[10px] tracking-[0.3em] uppercase select-none relative z-10">
        Professional Writing Intelligence • Version 2.5.0
      </footer>
    </div>
  );
};

export default LandingView;
