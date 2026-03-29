import { useCallback, useState } from 'react';

let nextToastId = 1;

function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = nextToastId += 1;
    const duration = toast.duration ?? 2800;
    setToasts((current) => [...current, { id, tone: 'info', ...toast }]);

    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, duration);
    }

    return id;
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast
  };
}

export default useToast;
