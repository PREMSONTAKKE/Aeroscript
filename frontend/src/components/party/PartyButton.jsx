import React from 'react';
import { Users } from 'lucide-react';

function PartyButton({ onClick, isActive, memberCount }) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border p-3 transition ${
        isActive
          ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      <Users size={18} />
      {isActive && memberCount > 1 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
          {memberCount}
        </span>
      )}
    </button>
  );
}

export default PartyButton;
