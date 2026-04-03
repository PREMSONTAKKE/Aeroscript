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
  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);
  const prevXRef = useRef(null);
  const prevYRef = useRef(null);
  const EMA_ALPHA = 0.5;

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (videoRef.current && videoRef.current.parentNode) {
      videoRef.current.parentNode.removeChild(videoRef.current);
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
    prevXRef.current = null;
    prevYRef.current = null;
    videoRef.current = null;
    setIsActive(false);
    setIsReady(false);
    setHandState(EMPTY_HAND_STATE);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      setError(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
        );

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

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480, frameRate: 30 }
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          landmarker.close();
          return;
        }

        streamRef.current = stream;

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;z-index:-1;';
        document.body.appendChild(container);

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.style.cssText = 'width:640px;height:480px;';
        container.appendChild(video);

        videoRef.current = video;

        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(() => resolve());
          };
          video.onerror = () => resolve();
          setTimeout(resolve, 5000);
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          landmarker.close();
          return;
        }

        setIsReady(true);
        setIsActive(true);

        const detect = () => {
          if (!landmarkerRef.current || !videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }

          try {
            const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());

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

              if (prevXRef.current === null || prevYRef.current === null) {
                smoothXRef.current = rawX;
                smoothYRef.current = rawY;
                prevXRef.current = rawX;
                prevYRef.current = rawY;
              } else {
                smoothXRef.current = EMA_ALPHA * rawX + (1 - EMA_ALPHA) * smoothXRef.current;
                smoothYRef.current = EMA_ALPHA * rawY + (1 - EMA_ALPHA) * smoothYRef.current;
                prevXRef.current = rawX;
                prevYRef.current = rawY;
              }

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
            } else {
              smoothXRef.current = 0;
              smoothYRef.current = 0;
              prevXRef.current = null;
              prevYRef.current = null;
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
