import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API = (path, opts = {}, token) => {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, { ...opts, headers });
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('cp_token') || null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cp_user') || 'null'); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('cp_token', data.token);
    localStorage.setItem('cp_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (full_name, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('cp_token', data.token);
    localStorage.setItem('cp_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    setToken(null);
    setUser(null);
  }, []);

  // Authenticated fetch — automatically injects Bearer token
  const authFetch = useCallback((path, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, { ...opts, headers });
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, authFetch, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
