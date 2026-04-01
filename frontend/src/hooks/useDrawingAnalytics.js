import { useRef, useCallback, useEffect, useState } from 'react';
import { profileApi } from '../services/presetsApi';
import { useAuth } from '../context/AuthContext';

export function useDrawingAnalytics(userId) {
  const { user } = useAuth();
  const analyticsRef = useRef({
    strokesCount: 0,
    drawingStartTime: null,
    totalDrawingTime: 0,
    sessionStartTime: null,
    brushWidths: [],
    colors: [],
    inkTypes: [],
    modes: [],
    currentMode: 'draw',
    lastStrokeTime: null,
    initialized: false,
  });
  const [currentStats, setCurrentStats] = useState({
    strokesCount: 0,
    sessionStartTime: null,
  });

  useEffect(() => {
    if (!analyticsRef.current.initialized) {
      analyticsRef.current.sessionStartTime = Date.now();
      analyticsRef.current.drawingStartTime = Date.now();
      analyticsRef.current.initialized = true;
    }
  }, []);

  const flushAnalytics = useCallback(async () => {
    const effectiveUser = user;
    const token = effectiveUser?.token || userId;
    if (!token) return;
    
    const analytics = analyticsRef.current;
    if (analytics.strokesCount === 0) return;
    
    const drawingTime = analytics.totalDrawingTime + 
      (analytics.drawingStartTime ? Date.now() - analytics.drawingStartTime : 0);
    
    try {
      await profileApi.recordAnalytics(token, {
        strokes: analytics.strokesCount,
        drawingTime,
        sessions: 1,
        brushWidths: [...new Set(analytics.brushWidths)],
        colors: [...new Set(analytics.colors)],
        inkTypes: [...new Set(analytics.inkTypes)],
        modes: [...new Set(analytics.modes)],
      });
    } catch (error) {
      console.error('Failed to flush analytics:', error);
    }
  }, [user, userId]);

  const trackSessionEnd = useCallback(() => {
    const effectiveUser = user;
    const token = effectiveUser?.token || userId;
    const analytics = analyticsRef.current;
    if (analytics.strokesCount === 0 || !token) return;
    
    const drawingTime = analytics.totalDrawingTime + 
      (analytics.drawingStartTime ? Date.now() - analytics.drawingStartTime : 0);
    
    profileApi.recordAnalytics(token, {
      strokes: analytics.strokesCount,
      drawingTime,
      sessions: 1,
      brushWidths: [...new Set(analytics.brushWidths)],
      colors: [...new Set(analytics.colors)],
      inkTypes: [...new Set(analytics.inkTypes)],
      modes: [...new Set(analytics.modes)],
    }).catch(error => console.error('Failed to record session analytics:', error));
  }, [user, userId]);

  const trackStroke = useCallback((stroke) => {
    const analytics = analyticsRef.current;
    
    analytics.strokesCount += 1;
    
    if (stroke.brushWidth) {
      analytics.brushWidths.push(Math.round(stroke.brushWidth));
    }
    
    if (stroke.brushColor) {
      analytics.colors.push(stroke.brushColor);
    }
    
    if (stroke.inkType) {
      analytics.inkTypes.push(stroke.inkType);
    }
    
    if (stroke.mode) {
      analytics.modes.push(stroke.mode);
    }
    
    if (analytics.lastStrokeTime) {
      analytics.totalDrawingTime += Date.now() - analytics.lastStrokeTime;
    }
    analytics.lastStrokeTime = Date.now();
    analytics.drawingStartTime = Date.now();
    
    setCurrentStats({
      strokesCount: analytics.strokesCount,
      sessionStartTime: analytics.sessionStartTime,
    });
  }, []);

  const trackModeChange = useCallback((newMode) => {
    analyticsRef.current.currentMode = newMode;
    analyticsRef.current.modes.push(newMode);
  }, []);

  const getStrokesPerMinute = useCallback(() => {
    const analytics = analyticsRef.current;
    if (!analytics.sessionStartTime || analytics.strokesCount === 0) return 0;
    
    const elapsedMinutes = (Date.now() - analytics.sessionStartTime) / 60000;
    return (analytics.strokesCount / elapsedMinutes).toFixed(1);
  }, []);

  const getSessionDuration = useCallback(() => {
    const analytics = analyticsRef.current;
    if (!analytics.sessionStartTime) return 0;
    
    const duration = analytics.totalDrawingTime + 
      (analytics.drawingStartTime ? Date.now() - analytics.drawingStartTime : 0);
    
    return Math.round(duration / 1000);
  }, []);

  const getAnalyticsSummary = useCallback(async () => {
    const effectiveUser = user;
    const token = effectiveUser?.token || userId;
    if (!token) return null;
    
    try {
      const response = await profileApi.getAnalyticsSummary(token, 'week');
      return response.summary;
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return null;
    }
  }, [user, userId]);

  return {
    trackStroke,
    trackModeChange,
    trackSessionEnd,
    flushAnalytics,
    getStrokesPerMinute,
    getSessionDuration,
    getAnalyticsSummary,
    currentStats,
  };
}
