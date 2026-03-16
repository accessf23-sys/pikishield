import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
const AUTH_TIMEOUT_MS = 4000; // 4-second safety timeout

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('piki_boot_time');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token     = localStorage.getItem('token');
    const loginTime = localStorage.getItem('piki_boot_time');

    if (!token) {
      setLoading(false);
      return;
    }

    if (loginTime && Date.now() - Number(loginTime) > SESSION_MS) {
      clearAuth();
      setLoading(false);
      return;
    }

    let finished = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      finish();
    }, AUTH_TIMEOUT_MS);

    authAPI.me()
      .then(res => {
        if (!finished) setUser(res.data);
      })
      .catch(() => clearAuth())
      .finally(() => {
        clearTimeout(timeoutId);
        finish();
      });

    return () => {
      clearTimeout(timeoutId);
      finished = true;
    };

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (identifier, password) => {
    const res = await authAPI.login({
      phone: identifier,
      email: identifier,
      password
    });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('piki_boot_time', String(Date.now()));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  const logout = () => { clearAuth(); setUser(null); };

  const refreshUser = async () => {
    const res = await authAPI.me();
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
