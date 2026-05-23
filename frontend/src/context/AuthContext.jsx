import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('vault_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getProfile();
        setUser(res.user);
        setOrganization(res.organization);
      } catch (err) {
        console.error('Failed to load session:', err.message);
        localStorage.removeItem('vault_token');
        setUser(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('vault_token', res.token);
    setUser(res.user);
    if (res.user.org_id) {
      const profile = await api.getProfile().catch(() => null);
      if (profile) setOrganization(profile.organization);
    }
    return res.user;
  };

  const register = async (data) => {
    const res = await api.register(data);
    localStorage.setItem('vault_token', res.token);
    setUser(res.user);
    const profile = await api.getProfile().catch(() => null);
    if (profile) setOrganization(profile.organization);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('vault_token');
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
