import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PenTool, Palette, Type, LogOut, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LARGE_STAR_POSITIONS } from '../utils/starField';
import ParticleWave from '../components/AeroCanvas/ParticleWave';
import FloatingParticles from '../components/AeroCanvas/FloatingParticles';
import TutorialModal from '../components/workspace/TutorialModal';

const MotionDiv = motion.div;
const MotionHeading = motion.h2;
const MotionParagraph = motion.p;

const DOT_TEXT = 'AEROSCRIPT';
const DOT_SIZE = 1;
const DOT_GAP = 3;

const ModeCard = ({ title, description, icon: Icon, mode, onClick, colorClass }) => (
  <MotionDiv
    whileHover={{ y: -10, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onClick(mode)}
    className="relative group cursor-pointer"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-10 group-hover:opacity-25 transition-opacity rounded-[32px] blur-xl animate-pulse`} style={{ animationDuration: '3s' }} />
    <div className="relative glass-panel p-8 rounded-[32px] border border-white/5 bg-transparent backdrop-blur-[8px] h-full flex flex-col items-center text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <div className={`relative p-6 rounded-2xl bg-white/5 ${colorClass.split(' ')[1]} mb-6`}>
        <MotionDiv
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {React.createElement(Icon, { size: 40 })}
        </MotionDiv>
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

const DotTextCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const dotsRef = useRef([]);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = 800;
    const height = 120;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    offCtx.fillStyle = '#fff';
    offCtx.font = 'bold 72px monospace';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText('AEROSCRIPT', width / 2, height / 2);
    const imageData = offCtx.getImageData(0, 0, width, height);

    const targetDots = 100000;
    const textPixels = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (imageData.data[i] > 128) textPixels.push({ x, y });
      }
    }

    const step = Math.max(1, Math.floor(textPixels.length / targetDots));
    const selectedPixels = [];
    for (let i = 0; i < textPixels.length; i += step) selectedPixels.push(textPixels[i]);

    dotsRef.current = selectedPixels.map((p, i) => ({
      x: p.x,
      y: p.y,
      delay: i * 0.00003,
      seed: Math.random() * 1000,
      flickerSpeed: 0.5 + Math.random() * 2,
      flickerOffset: Math.random() * Math.PI * 2,
    }));

    startTimeRef.current = performance.now();

    const animate = (now) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < dotsRef.current.length; i++) {
        const dot = dotsRef.current[i];
        const progress = Math.min(1, (elapsed - dot.delay) * 2);
        if (progress <= 0) continue;

        const flicker = 0.6 + 0.4 * Math.sin(elapsed * dot.flickerSpeed + dot.flickerOffset);
        const alpha = progress * flicker * 0.8;

        ctx.fillStyle = `rgba(96, 165, 250, ${alpha})`;
        ctx.fillRect(dot.x, dot.y, 1, 1);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} className="block" />;
};

const LandingView = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);

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
      <ParticleWave scrollProgress={0} />
      <FloatingParticles />
      
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {LARGE_STAR_POSITIONS.map((star, i) => (
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

      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/15 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </MotionDiv>

      <MotionDiv
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="fixed top-6 right-8 z-20 flex items-center gap-4"
      >
        <button
          onClick={() => setShowTutorial(true)}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/5 hover:border-cyan-400/20 transition-all"
          title="Help & Tutorial"
        >
          <HelpCircle size={18} />
        </button>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">Authorized User</span>
          <span className="text-sm text-slate-200">{user?.email}</span>
        </div>
        <button 
          onClick={logout}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-red-400 hover:bg-red-400/5 hover:border-red-400/20 transition-all"
        >
          <LogOut size={18} />
        </button>
      </MotionDiv>

      <header className="w-full max-w-7xl flex justify-end items-center mb-12 relative z-10">
      </header>

      <main className="flex-1 w-full max-w-7xl flex flex-col items-center justify-center relative z-10">
        <div className="text-center mb-16">
          <MotionDiv 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <DotTextCanvas />
          </MotionDiv>
          <MotionParagraph 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mb-4"
          >
            Select Your Workspace
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

      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};

export default LandingView;
