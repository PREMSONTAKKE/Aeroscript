import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Lock, Unlock, Crown, UserMinus } from 'lucide-react';
import ModalShell from '../workspace/ModalShell';
import { API_BASE } from '../../config/api';
import partyService from '../../services/partyService';

function PartyModal({ isOpen, token, currentParty, onClose, onPartyJoined, onPartyLeft }) {
  const [mode, setMode] = useState('create');
  const [partyName, setPartyName] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [members, setMembers] = useState([]);
  const [hostId, setHostId] = useState(null);

  useEffect(() => {
    if (currentParty?.code) {
      setIsHost(partyService.getIsHost());
      setIsLocked(partyService.getIsLocked());
      const mappedMembers = (currentParty.members || []).map(m => ({
        ...m,
        userId: m.user?.toString() || m.userId,
        name: m.name || m.userName
      }));
      setMembers(mappedMembers);
      setHostId(currentParty.host?.toString() || currentParty.host);
    }

    partyService.onPresence((data) => {
      if (data.party?.code === currentParty?.code) {
        setMembers(data.members || []);
        setIsHost(partyService.getIsHost());
        setIsLocked(partyService.getIsLocked());
        if (data.party?.host) {
          setHostId(data.party.host);
        }
      }
    });

    partyService.onLockChanged((locked) => {
      setIsLocked(locked);
    });

    partyService.onKicked((reason) => {
      setError(reason || 'You have been removed from the party');
      setTimeout(() => {
        onPartyLeft?.();
        onClose();
      }, 2000);
    });
  }, [currentParty, onPartyLeft, onClose]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const party = await partyService.createParty(partyName.trim(), token);
      onPartyJoined(party);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const party = await partyService.joinParty(partyCode.trim().toUpperCase(), token);
      onPartyJoined(party);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (currentParty?.code) {
      navigator.clipboard.writeText(currentParty.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    if (currentParty) {
      try {
        await fetch(`${API_BASE}/party/${currentParty.code}/leave`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Leave party error:', err);
      }
      partyService.leaveParty();
      onPartyLeft?.();
      onClose();
    }
  };

  const handleKick = async (memberId) => {
    try {
      await partyService.kickMember(memberId, token);
      setMembers(prev => prev.filter(m => m.userId !== memberId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleLock = async () => {
    try {
      const newState = await partyService.toggleLock(token);
      setIsLocked(newState);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTransferHost = async (newHostId) => {
    try {
      await partyService.transferHost(newHostId, token);
      setHostId(newHostId);
      setIsHost(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const modalTitle = currentParty 
    ? 'Party Lobby' 
    : mode === 'create' ? 'Create Party' : 'Join Party';

  return (
    <ModalShell
      isOpen={isOpen}
      title={modalTitle}
      onClose={onClose}
      size="md"
      zIndex="z-[9999]"
      showHeader={false}
    >
      {currentParty ? (
        <div className="space-y-4 -mt-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Party Code</p>
                <p className="text-2xl font-bold text-cyan-400">{currentParty.code}</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <p className="text-xs uppercase tracking-widest text-slate-500">Members</p>
              </div>
              {isHost && (
                <button
                  onClick={handleToggleLock}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition ${
                    isLocked 
                      ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                      : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                  }`}
                >
                  {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  {isLocked ? 'Locked' : 'Unlock'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {members.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 p-2">
                  <div className="flex-1">
                    <span className="text-sm text-slate-200">{member.userName || member.name || member.userId || 'Anonymous'}</span>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {(member.inputMode || 'mouse').replace('-', ' ')} input
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHost && member.userId !== hostId && (
                      <>
                        <button
                          onClick={() => handleTransferHost(member.userId)}
                          className="rounded-lg bg-yellow-500/20 p-1.5 text-yellow-300 hover:bg-yellow-500/30"
                          title="Make host"
                        >
                          <Crown size={12} />
                        </button>
                        <button
                          onClick={() => handleKick(member.userId)}
                          className="rounded-lg bg-red-500/20 p-1.5 text-red-300 hover:bg-red-500/30"
                          title="Kick member"
                        >
                          <UserMinus size={12} />
                        </button>
                      </>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400">
                      {member.userId === hostId || member.isHost ? 'Host' : 'Live'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Shared Board</p>
            <p className="mt-2 text-sm text-slate-200">
              {currentParty.board?.strokes?.length || 0} synced strokes
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Last updated by {currentParty.board?.updatedBy || 'the party'}.
            </p>
          </div>

          <button
            onClick={handleLeave}
            className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm text-red-300 hover:bg-red-500/20"
          >
            Leave Party
          </button>
        </div>
      ) : (
        <>
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 rounded-xl py-2.5 text-sm transition ${
                mode === 'create' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Create
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 rounded-xl py-2.5 text-sm transition ${
                mode === 'join' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Join
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  Party Name
                </label>
                <input
                  autoFocus
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="My Awesome Party"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !partyName.trim()}
                className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Party'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  Party Code
                </label>
                <input
                  autoFocus
                  value={partyCode}
                  onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm uppercase text-white outline-none focus:border-cyan-400/40"
                  required
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || partyCode.length !== 6}
                className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {isLoading ? 'Joining...' : 'Join Party'}
              </button>
            </form>
          )}
        </>
      )}
    </ModalShell>
  );
}

export default PartyModal;
