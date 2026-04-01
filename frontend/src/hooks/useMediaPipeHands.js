import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const EMPTY_HAND_STATE = {
  x: 0,
  y: 0,
  isVisible: false,
  isDrawing: false,
  fingersCount: 0,
  landmarks: []
};

function useMediaPipeHands(enabled) {
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [handState, setHandState] = useState(EMPTY_HAND_STATE);
  const [error, setError] = useState(null);

  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);
  const EMA_ALPHA = 0.35;
  const logCounterRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (videoRef.current && videoRef.current.parentNode) {
      videoRef.current.parentNode.removeChild(videoRef.current);
    }
    if (canvasRef.current && canvasRef.current.parentNode) {
      canvasRef.current.parentNode.removeChild(canvasRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }
    smoothXRef.current = 0;
    smoothYRef.current = 0;
    videoRef.current = null;
    canvasRef.current = null;
    setIsActive(false);
    setIsReady(false);
    setHandState(EMPTY_HAND_STATE);
  }, []);

  useEffect(() => {
    console.log('[MediaPipe] useEffect running, enabled:', enabled);
    if (!enabled) {
      stop();
      setError(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      console.log('[MediaPipe] init started');
      try {
        console.log('[MediaPipe] Loading FilesetResolver...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
        );
        console.log('[MediaPipe] Creating HandLandmarker...');

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        console.log('[MediaPipe] HandLandmarker created');

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        console.log('[MediaPipe] Requesting camera...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 320, height: 240, frameRate: 30 }
        });
        console.log('[MediaPipe] Camera stream obtained');

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          landmarker.close();
          return;
        }

        streamRef.current = stream;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        canvas.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;pointer-events:none;border:2px solid cyan;background:#000;';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        videoRef.current = video;
        canvasRef.current = canvas;
        console.log('[MediaPipe] Video element created');

        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(() => resolve());
          };
          video.onerror = () => resolve();
          setTimeout(resolve, 5000);
        });
        console.log('[MediaPipe] Video playing, readyState:', video.readyState);

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          landmarker.close();
          return;
        }

        setIsReady(true);
        setIsActive(true);
        console.log('[MediaPipe] Detection loop started');

        const detect = () => {
          if (!landmarkerRef.current || !videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }

          try {
            ctx.drawImage(videoRef.current, 0, 0, 320, 240);
            const results = landmarkerRef.current.detect(canvas);

            logCounterRef.current++;
            if (logCounterRef.current % 60 === 0) {
              console.log('[MediaPipe] detectForVideo result:', results?.landmarks?.length > 0 ? 'Hand found' : 'No hand', 'video:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
            }

            if (results?.landmarks?.length > 0) {
              const lm = results.landmarks[0];
              const idxTip = lm[8];
              const idxPip = lm[6];
              const midTip = lm[12];
              const midPip = lm[10];
              const ringTip = lm[16];
              const ringPip = lm[14];
              const pinkyTip = lm[20];
              const pinkyPip = lm[18];

              const idxUp = idxTip.y < idxPip.y;
              const midUp = midTip.y < midPip.y;
              const ringUp = ringTip.y < ringPip.y;
              const pinkyUp = pinkyTip.y < pinkyPip.y;
              const fingersUp = [idxUp, midUp, ringUp, pinkyUp].filter(Boolean).length;

              const isDrawing = idxUp && fingersUp === 1;

              const rawX = idxTip.x;
              const rawY = idxTip.y;

              if (smoothXRef.current === 0 && smoothYRef.current === 0) {
                smoothXRef.current = rawX;
                smoothYRef.current = rawY;
              }
              smoothXRef.current = EMA_ALPHA * rawX + (1 - EMA_ALPHA) * smoothXRef.current;
              smoothYRef.current = EMA_ALPHA * rawY + (1 - EMA_ALPHA) * smoothYRef.current;

              const mirroredX = 100 - smoothXRef.current * 100;

              const landmarks = lm.map(p => ({
                x: Math.round((1 - p.x) * 100),
                y: Math.round(p.y * 100)
              }));

              setHandState({
                x: mirroredX,
                y: Math.round(smoothYRef.current * 100),
                isVisible: true,
                isDrawing,
                fingersCount: fingersUp,
                landmarks
              });
              console.log('[MediaPipe] Hand detected! fingers:', fingersUp, 'isDrawing:', isDrawing);
            } else {
              smoothXRef.current = 0;
              smoothYRef.current = 0;
              setHandState(prev => prev.isVisible ? { ...EMPTY_HAND_STATE } : prev);
            }
          } catch (e) {
            console.error('[MediaPipe] Error:', e);
            setHandState(prev => prev.isVisible ? { ...EMPTY_HAND_STATE } : prev);
          }

          rafRef.current = requestAnimationFrame(detect);
        };

        rafRef.current = requestAnimationFrame(detect);
      } catch (err) {
        if (!cancelled) {
          console.error('[MediaPipe] Init error:', err);
          setError(err.message);
          setIsActive(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, stop]);

  return {
    isReady: enabled && isReady,
    isActive: enabled && isActive,
    handState: enabled ? handState : EMPTY_HAND_STATE,
    error
  };
}

export default useMediaPipeHands;
