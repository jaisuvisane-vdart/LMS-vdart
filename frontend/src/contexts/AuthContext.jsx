import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('lms_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('lms_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.status === 'success' && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('lms_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Session sync failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.status === 'success') {
      if (res.data?.requires_first_login_verification) {
        return res.data;
      }
      if (res.data?.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('lms_token', res.data.token);
        localStorage.setItem('lms_user', JSON.stringify(res.data.user));
        return res.data.user;
      }
    }
    throw new Error(res.message || 'Login failed');
  };

  const requestFirstLoginOtp = async (email) => {
    const res = await api.post('/auth/request-first-login-otp', { email });
    if (res.status === 'success') {
      return res.data;
    }
    throw new Error(res.message || 'Failed to dispatch verification code');
  };

  const completeFirstLogin = (userData, userToken) => {
    setToken(userToken);
    setUser(userData);
    localStorage.setItem('lms_token', userToken);
    localStorage.setItem('lms_user', JSON.stringify(userData));
  };

  const loginWithGoogle = async (idToken) => {
    const res = await api.post('/auth/google-login', { id_token: idToken });
    if (res.status === 'success' && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('lms_token', res.data.token);
      localStorage.setItem('lms_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error(res.message || 'Google authentication failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
  };

  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    if (typeof roles === 'string') return user.role.toLowerCase() === roles.toLowerCase();
    return roles.map(r => r.toLowerCase()).includes(user.role.toLowerCase());
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, requestFirstLoginOtp, completeFirstLogin, logout, hasRole, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
