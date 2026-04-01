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

  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastDetectedRef = useRef(0);
  const frameCountRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }
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
          video: { facingMode: 'user', width: 640, height: 480 }
        });

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
        videoRef.current = video;

        await video.play();

        setIsReady(true);
        setIsActive(true);

        const detect = async () => {
          if (!landmarkerRef.current || !videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }

          try {
            const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());

            if (results.landmarks && results.landmarks.length > 0) {
              lastDetectedRef.current = Date.now();
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

              const isDrawing = idxUp;

              const fingersCount = [idxUp, midUp, ringUp, pinkyUp].filter(Boolean).length;

              const landmarks = lm.map(p => ({
                x: Math.round(p.x * 100),
                y: Math.round(p.y * 100)
              }));

              const rawX = idxTip.x;
              const mirroredX = 100 - rawX;

              setHandState({
                x: Math.round(mirroredX),
                y: Math.round(idxTip.y * 100),
                isVisible: true,
                isDrawing,
                fingersCount,
                landmarks
              });

              frameCountRef.current++;
              if (frameCountRef.current % 30 === 0) {
                console.log('[MediaPipeHands] Detected:', { x: Math.round(mirroredX), y: Math.round(idxTip.y * 100), isDrawing, fingersCount });
              }
            } else {
              const timeSinceLast = Date.now() - lastDetectedRef.current;
              if (timeSinceLast > 200) {
                setHandState(prev => prev.isVisible ? { ...EMPTY_HAND_STATE } : prev);
              }
              frameCountRef.current++;
              if (frameCountRef.current % 150 === 0) {
                console.log('[MediaPipeHands] No hand detected. Video readyState:', videoRef.current?.readyState, 'Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
              }
            }
          } catch (e) {
            console.warn('[MediaPipeHands] Detection error:', e.message);
          }

          rafRef.current = requestAnimationFrame(detect);
        };
      } catch (err) {
        if (!cancelled) {
          console.error('[MediaPipeHands] Init error:', err);
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
