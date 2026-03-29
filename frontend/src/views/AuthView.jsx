import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Key } from 'lucide-react';
import CursorTrail from '../components/AeroCanvas/CursorTrail';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

const MotionDiv = motion.div;
const MotionP = motion.p;
const STAR_POSITIONS = Array.from({ length: 50 }, () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 5}s`
}));

const AuthView = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isSignUp ? 'signup' : 'signin';
    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        login({ email: data.email, token: data.token, userId: data.userId });
      } else {
        setError(data.details || data.error || 'Authentication Failed');
      }
    } catch (err) {
      console.error('Auth Connection Error:', err);
      setError('Connection failed. Check server logs.');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#06080d] flex flex-col items-center justify-center z-[2000] overflow-hidden font-sans">
      <CursorTrail />
      
      <div className="absolute inset-0 opacity-20">
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

      <div className="relative text-center mb-12 select-none">
        <h1 className="text-7xl font-bold tracking-[0.25em] text-white mb-2 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          AEROSCRIPT
        </h1>
        <p className="text-slate-500 tracking-[0.5em] text-xs uppercase">
          Kinetic Writing Intelligence
        </p>
      </div>

      <MotionDiv 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-[440px] p-10 rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl relative z-10"
      >
        <div className="flex justify-center gap-8 mb-8 border-b border-white/5 pb-4">
          <button 
            onClick={() => { setIsSignUp(false); setError(''); }}
            className={`text-xs uppercase tracking-[0.2em] font-bold transition-all ${!isSignUp ? 'text-blue-500 border-b-2 border-blue-500 pb-1' : 'text-slate-500 hover:text-white'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setIsSignUp(true); setError(''); }}
            className={`text-xs uppercase tracking-[0.2em] font-bold transition-all ${isSignUp ? 'text-blue-500 border-b-2 border-blue-500 pb-1' : 'text-slate-500 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Digital Identifier</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" required placeholder="Email Address"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:border-blue-500 outline-none transition-all"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Secure Key</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" required placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:border-blue-500 outline-none transition-all"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <MotionP 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-[10px] text-center uppercase tracking-[0.15em] font-medium bg-red-400/10 py-2 rounded-lg"
            >
              {error}
            </MotionP>
          )}

          <button 
            type="submit"
            className="w-full py-5 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-widest hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-[0.98] transition-all"
          >
            {isSignUp ? 'Create Account' : 'Authorize Access'}
          </button>

          <p className="text-center text-slate-500 text-[10px] uppercase tracking-[0.2em] select-none">
            {isSignUp ? "Already have an account?" : "Need an account?"} 
            <span 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-blue-500 ml-2 cursor-pointer hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </span>
          </p>
        </form>
      </MotionDiv>

      <div className="absolute bottom-12 text-slate-700 text-[10px] tracking-[0.3em] uppercase select-none">
        AES-256 Encrypted • V2.5.0-Stable
      </div>
    </div>
  );
};

export default AuthView;
