import React, { useState, useCallback, useEffect } from 'react';
import { 
  User, Trophy, TrendingUp, Clock, Zap, 
  Target, Award, X, Settings,
  BarChart3, Flame, Save, Loader2, Users
} from 'lucide-react';
import { profileApi } from '../../services/presetsApi';
import { useAuth } from '../../context/AuthContext';
import ModalShell from './ModalShell';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchWithAuth(url, options = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${url}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export default function ProfilePanel({ isOpen, onClose, pushToast, theme, setTheme, mode, currentParty }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [partyMembers, setPartyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [preferences, setPreferences] = useState({
    autoSave: true,
    showCursorTrails: true,
    soundEnabled: true,
    theme: 'dark'
  });

  const showAchievements = mode === 'draw' && !!currentParty;

  const loadProfileData = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [profileRes, analyticsRes] = await Promise.all([
        profileApi.get(user.token),
        profileApi.getAnalyticsSummary(user.token, 'week'),
      ]);
      setProfile(profileRes.profile);
      setAnalytics(analyticsRes.summary);
      
      setDisplayName(profileRes.profile?.displayName || '');
      setBio(profileRes.profile?.bio || '');
      setPreferences({
        autoSave: profileRes.profile?.preferences?.autoSave ?? true,
        showCursorTrails: profileRes.profile?.preferences?.showCursorTrails ?? true,
        soundEnabled: profileRes.profile?.preferences?.soundEnabled ?? true,
        theme: profileRes.profile?.preferences?.theme ?? 'dark',
      });
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const loadPartyMembers = useCallback(async () => {
    if (!user?.token || !currentParty?.code) return;
    setLoadingMembers(true);
    try {
      const data = await fetchWithAuth(`/api/party/${currentParty.code}/members-achievements`, {}, user.token);
      setPartyMembers(data.members || []);
    } catch (err) {
      console.error('Failed to load party members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [user?.token, currentParty?.code]);

  useEffect(() => {
    if (isOpen && user?.token) {
      loadProfileData();
      if (showAchievements) {
        loadPartyMembers();
      }
    }
  }, [isOpen, user?.token, loadProfileData, showAchievements, loadPartyMembers]);

  useEffect(() => {
    if (selectedMember && partyMembers.length > 0) {
      const updated = partyMembers.find(m => m.userId === selectedMember.userId);
      if (updated) setSelectedMember(updated);
    }
  }, [partyMembers, selectedMember]);

  const handleSaveProfile = async () => {
    if (!user?.token) return;
    setSavingProfile(true);
    try {
      await profileApi.update(user.token, {
        displayName: displayName.trim(),
        bio: bio.trim()
      });
      pushToast?.({ title: 'Profile Updated', description: 'Your profile has been saved.', tone: 'success' });
    } catch (err) {
      pushToast?.({ title: 'Error', description: err.message || 'Failed to save profile', tone: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user?.token) return;
    setSavingPreferences(true);
    try {
      await profileApi.updatePreferences(user.token, preferences);
      pushToast?.({ title: 'Preferences Saved', description: 'Your preferences have been updated.', tone: 'success' });
      
      if (preferences.soundEnabled !== profile?.preferences?.soundEnabled) {
        window.localStorage.setItem('aeroscript_sound', preferences.soundEnabled);
      }
      
      if (preferences.theme !== theme && setTheme) {
        setTheme(preferences.theme);
      }
    } catch (err) {
      pushToast?.({ title: 'Error', description: err.message || 'Failed to save preferences', tone: 'error' });
    } finally {
      setSavingPreferences(false);
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderAchievementCard = (achievement, compact = false) => (
    <div
      key={achievement.name + (achievement.earnedAt || '')}
      className={`flex items-center gap-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 shrink-0">
        <Award size={24} className="text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate">{achievement.name}</h4>
        <p className="text-xs text-slate-400">{achievement.description}</p>
      </div>
      {achievement.earnedAt && (
        <span className="text-xs text-slate-500 shrink-0">
          {new Date(achievement.earnedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );

  const renderMemberAchievements = (member) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setSelectedMember(null)}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <X size={16} />
        </button>
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
          <User size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{member.name}</h3>
          <p className="text-xs text-slate-400">{member.email}</p>
        </div>
      </div>
      {member.achievements?.length > 0 ? (
        <div className="space-y-3">
          {member.achievements.map((a, i) => renderAchievementCard(a, true))}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400">
          <Trophy size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No achievements yet</p>
        </div>
      )}
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showHeader={false}
      className="max-h-[85vh] flex flex-col overflow-hidden"
    >
      <div className="relative border-b border-white/10 p-6 text-center -mx-6 -mt-6 mb-0">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
        
        <div className="mx-auto mb-3 h-20 w-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-1">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
            <User size={32} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-white">
          {profile?.displayName || user?.email?.split('@')[0] || 'Artist'}
        </h2>
        {profile?.bio && (
          <p className="mt-1 text-sm text-slate-400">{profile.bio}</p>
        )}
        
        {analytics?.streakDays > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5">
            <Flame size={16} className="text-orange-400" />
            <span className="text-sm font-medium text-orange-400">
              {analytics.streakDays} day streak
            </span>
          </div>
        )}
      </div>

      <div className="flex border-b border-white/10">
        <button
          onClick={() => { setActiveTab('stats'); setSelectedMember(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === 'stats'
              ? 'border-b-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 size={16} />
          Stats
        </button>
        {showAchievements && (
          <button
            onClick={() => { setActiveTab('achievements'); setSelectedMember(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'achievements'
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={16} />
            Achievements
          </button>
        )}
        <button
          onClick={() => { setActiveTab('settings'); setSelectedMember(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === 'settings'
              ? 'border-b-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <Zap size={16} />
                      <span className="text-xs uppercase tracking-wider">Strokes</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analytics?.totalStrokes?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <Clock size={16} />
                      <span className="text-xs uppercase tracking-wider">Drawing Time</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatTime(analytics?.totalDrawingTime || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <TrendingUp size={16} />
                      <span className="text-xs uppercase tracking-wider">Strokes/Min</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {analytics?.strokesPerMinute || 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <Target size={16} />
                      <span className="text-xs uppercase tracking-wider">Avg Session</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatTime(analytics?.averageSessionLength || 0)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h4 className="mb-3 text-xs uppercase tracking-wider text-slate-400">Most Used Brush</h4>
                  {analytics?.mostUsedBrush ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg border border-white/20"
                        style={{ backgroundColor: analytics.mostUsedColor?.color || '#e2e8f0' }}
                      />
                      <div>
                        <p className="font-medium text-white">
                          {analytics.mostUsedBrush.width}px
                        </p>
                        <p className="text-xs text-slate-400">
                          {analytics.mostUsedBrush.count} strokes
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No brush data yet</p>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h4 className="mb-3 text-xs uppercase tracking-wider text-slate-400">This Week</h4>
                  {analytics?.weeklyStrokes?.length > 0 ? (
                    <div className="flex items-end justify-between gap-1" style={{ height: 80 }}>
                      {analytics.weeklyStrokes.slice(-7).map((day, i) => {
                        const maxStrokes = Math.max(...analytics.weeklyStrokes.slice(-7).map(d => d.count), 1);
                        const height = (day.count / maxStrokes) * 100;
                        return (
                          <div key={i} className="flex flex-1 flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-cyan-400/50 transition-all"
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                            <span className="text-[10px] text-slate-500">
                              {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No drawing activity this week</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'achievements' && showAchievements && (
              <div className="space-y-4">
                {selectedMember ? (
                  renderMemberAchievements(selectedMember)
                ) : loadingMembers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={16} className="text-cyan-400" />
                      <h3 className="text-sm font-medium text-white">Party Members</h3>
                    </div>
                    <div className="space-y-2">
                      {partyMembers.map((member) => (
                        <button
                          key={member.userId}
                          onClick={() => setSelectedMember(member)}
                          className="w-full flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-cyan-400/30 transition text-left"
                        >
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shrink-0">
                            <User size={18} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{member.name}</p>
                            <p className="text-xs text-slate-400 truncate">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Trophy size={16} className="text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-400">
                              {member.achievements?.length || 0}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                      <h3 className="text-sm font-medium text-white mb-3">Your Achievements</h3>
                      {profile?.achievements?.length > 0 ? (
                        <div className="space-y-3">
                          {profile.achievements.map((achievement, i) => renderAchievementCard(achievement))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400">
                          <Trophy size={48} className="mx-auto mb-3 opacity-30" />
                          <p>No achievements yet</p>
                          <p className="text-sm">Keep drawing to unlock achievements!</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-400">Display Name</label>
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm text-slate-400">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-slate-400">Preferences</h4>
                    <button
                      onClick={handleSavePreferences}
                      disabled={savingPreferences}
                      className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {savingPreferences ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Auto-save sessions</span>
                    <input
                      type="checkbox"
                      checked={preferences.autoSave}
                      onChange={(e) => setPreferences(prev => ({ ...prev, autoSave: e.target.checked }))}
                      className="h-5 w-9 rounded-full bg-white/10 checked:bg-cyan-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Show cursor trails</span>
                    <input
                      type="checkbox"
                      checked={preferences.showCursorTrails}
                      onChange={(e) => setPreferences(prev => ({ ...prev, showCursorTrails: e.target.checked }))}
                      className="h-5 w-9 rounded-full bg-white/10 checked:bg-cyan-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Sound effects</span>
                    <input
                      type="checkbox"
                      checked={preferences.soundEnabled}
                      onChange={(e) => setPreferences(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="h-5 w-9 rounded-full bg-white/10 checked:bg-cyan-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between pt-2">
                    <span className="text-sm text-slate-300">Theme</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, theme: 'dark' }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          preferences.theme === 'dark' 
                            ? 'bg-slate-700 text-white' 
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, theme: 'light' }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          preferences.theme === 'light' 
                            ? 'bg-cyan-500 text-slate-900' 
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        Light
                      </button>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
