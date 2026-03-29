import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthView from './views/AuthView';
import LandingView from './views/LandingView';
import WorkspaceView from './views/WorkspaceView';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
};

const AuthRoute = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <AuthView />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LandingView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:mode"
        element={
          <ProtectedRoute>
            <WorkspaceView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
