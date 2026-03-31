import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

const parseTokenPayload = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
};

const normalizeUser = (user) => {
  if (!user?.token) {
    return user;
  }

  const payload = parseTokenPayload(user.token);
  return {
    ...user,
    email: user.email || payload.email,
    userId: user.userId || payload.userId
  };
};

const STORAGE_KEY = 'aeroscript_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  const login = (userData, remember = true) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
