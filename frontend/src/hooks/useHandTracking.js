import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { HAND_TRACKING_SOCKET_URL } from '../config/api';

const EMPTY_HAND_STATE = {
  x: 0,
  y: 0,
  isVisible: false,
  isDrawing: false,
  fingersCount: 0,
  landmarks: []
};

function useHandTracking(enabled) {
  const [isConnected, setIsConnected] = useState(false);
  const [handState, setHandState] = useState(EMPTY_HAND_STATE);

  useEffect(() => {
    if (!enabled) {
      return () => {};
    }

    const socket = io(HAND_TRACKING_SOCKET_URL, {
      transports: ['polling'],
      upgrade: false,
      autoConnect: true,
      reconnection: true,
      reconnectionDelayMax: 10000
    });

    const handleConnect = () => {
      console.log('[HandTracking] Connected to socket server');
      setIsConnected(true);
    };
    const handleDisconnect = () => {
      console.log('[HandTracking] Disconnected from socket server');
      setIsConnected(false);
    };
    const handleConnectError = (err) => {
      console.error('[HandTracking] Connection error:', err);
      setIsConnected(false);
    };
    const handleHandData = (data) => {
      setHandState({
        x: typeof data?.x === 'number' ? data.x : 0,
        y: typeof data?.y === 'number' ? data.y : 0,
        isVisible: Boolean(data?.isVisible),
        isDrawing: Boolean(data?.isDrawing),
        fingersCount: Number(data?.fingersCount || 0),
        landmarks: Array.isArray(data?.landmarks) ? data.landmarks : []
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('hand_data', handleHandData);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('hand_data', handleHandData);
      socket.disconnect();
    };
  }, [enabled]);

  return useMemo(
    () => ({ isConnected: enabled ? isConnected : false, handState: enabled ? handState : EMPTY_HAND_STATE }),
    [enabled, handState, isConnected]
  );
}

export default useHandTracking;
