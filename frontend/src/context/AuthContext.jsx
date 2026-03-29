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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aeroscript_user');
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      localStorage.removeItem('aeroscript_user');
      return null;
    }
  });

  const login = (userData) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    localStorage.setItem('aeroscript_user', JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aeroscript_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
