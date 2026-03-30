import React, { useState, useEffect } from 'react';
import { 
  User, Trophy, TrendingUp, Clock, Zap, 
  Palette, Target, Award, X, Settings,
  BarChart3, Calendar, Flame, Star
} from 'lucide-react';
import { profileApi } from '../../services/presetsApi';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.token) {
      loadProfileData();
    }
  }, [isOpen, user?.token]);

  const loadProfileData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [profileRes, analyticsRes] = await Promise.all([
        profileApi.get(user.token),
        profileApi.getAnalyticsSummary(user.token, 'week'),
      ]);
      setProfile(profileRes.profile);
      setAnalytics(analyticsRes.summary);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-3xl">
        <div className="relative border-b border-white/10 p-6 text-center">
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
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'stats'
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 size={16} />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'achievements'
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={16} />
            Achievements
          </button>
          <button
            onClick={() => setActiveTab('settings')}
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
              {activeTab === 'stats' && analytics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-slate-400">
                        <Zap size={16} />
                        <span className="text-xs uppercase tracking-wider">Strokes</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {analytics.totalStrokes?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-slate-400">
                        <Clock size={16} />
                        <span className="text-xs uppercase tracking-wider">Drawing Time</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatTime(analytics.totalDrawingTime || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-slate-400">
                        <TrendingUp size={16} />
                        <span className="text-xs uppercase tracking-wider">Strokes/Min</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {analytics.strokesPerMinute || 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-slate-400">
                        <Target size={16} />
                        <span className="text-xs uppercase tracking-wider">Avg Session</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatTime(analytics.averageSessionLength || 0)}
                      </p>
                    </div>
                  </div>

                  {analytics.mostUsedBrush && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h4 className="mb-3 text-xs uppercase tracking-wider text-slate-400">Most Used Brush</h4>
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
                    </div>
                  )}

                  {analytics.weeklyStrokes?.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h4 className="mb-3 text-xs uppercase tracking-wider text-slate-400">This Week</h4>
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
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'achievements' && (
                <div className="space-y-3">
                  {profile?.achievements?.length > 0 ? (
                    profile.achievements.map((achievement, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                          <Award size={24} className="text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{achievement.name}</h4>
                          <p className="text-xs text-slate-400">{achievement.description}</p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(achievement.earnedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400">
                      <Trophy size={48} className="mx-auto mb-3 opacity-30" />
                      <p>No achievements yet</p>
                      <p className="text-sm">Keep drawing to unlock achievements!</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Display Name</label>
                    <input
                      type="text"
                      defaultValue={profile?.displayName || ''}
                      placeholder="Your display name"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Bio</label>
                    <textarea
                      defaultValue={profile?.bio || ''}
                      placeholder="Tell us about yourself"
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm text-slate-400">Preferences</h4>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Auto-save sessions</span>
                      <input
                        type="checkbox"
                        defaultChecked={profile?.preferences?.autoSave ?? true}
                        className="h-5 w-9 rounded-full bg-white/10 checked:bg-cyan-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Show cursor trails</span>
                      <input
                        type="checkbox"
                        defaultChecked={profile?.preferences?.showCursorTrails ?? true}
                        className="h-5 w-9 rounded-full bg-white/10 checked:bg-cyan-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Sound effects</span>
                      <input
                        type="checkbox"
                        defaultChecked={profile?.preferences?.soundEnabled ?? true}
                        className="h-5 w-9 rounded-full bg-white/10 checked:bg-cyan-500"
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
