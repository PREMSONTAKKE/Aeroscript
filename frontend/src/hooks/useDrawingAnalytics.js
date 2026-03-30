import { useRef, useCallback, useEffect } from 'react';
import { profileApi } from '../services/presetsApi';
import { useAuth } from '../context/AuthContext';

export function useDrawingAnalytics() {
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
  });

  useEffect(() => {
    analyticsRef.current.sessionStartTime = Date.now();
    analyticsRef.current.drawingStartTime = Date.now();
    
    return () => {
      flushAnalytics();
    };
  }, []);

  const flushAnalytics = useCallback(async () => {
    if (!user?.token) return;
    
    const analytics = analyticsRef.current;
    if (analytics.strokesCount === 0) return;
    
    const drawingTime = analytics.totalDrawingTime + 
      (analytics.drawingStartTime ? Date.now() - analytics.drawingStartTime : 0);
    
    try {
      await profileApi.recordAnalytics(user.token, {
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
  }, [user?.token]);

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
  }, []);

  const trackModeChange = useCallback((mode) => {
    analyticsRef.current.currentMode = mode;
    analyticsRef.current.modes.push(mode);
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
    if (!user?.token) return null;
    
    try {
      const response = await profileApi.getAnalyticsSummary(user.token, 'week');
      return response.summary;
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return null;
    }
  }, [user?.token]);

  return {
    trackStroke,
    trackModeChange,
    flushAnalytics,
    getStrokesPerMinute,
    getSessionDuration,
    getAnalyticsSummary,
    currentStats: analyticsRef.current,
  };
}
