import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { clearCache } from '../utils/pageCache';

const AuthContext = createContext(null);
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
const AUTH_TIMEOUT_MS = 4000; // 4-second safety timeout

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('piki_boot_time');
}

// Installed app: wipe the page history so the phone Back button leaves the app
// (instead of bouncing between old pages and the start screen).
function resetHistoryToLogin() {
  try {
    const installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    const n = window.history.length - 1;
    if (installed && n > 0) {
      window.history.go(-n);
      setTimeout(() => window.location.replace('/login'), 150);
    } else {
      window.location.replace('/login');
    }
  } catch (e) { window.location.replace('/login'); }
}

const isInstalled = () => {
  try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; }
};

// Installed app: every fresh launch (app closed, then opened again) starts signed out.
// sessionStorage is wiped when the app is closed, so a missing marker means a new launch.
(function freshLaunchCheck() {
  try {
    if (!isInstalled()) return;
    if (!sessionStorage.getItem('pk_alive')) { clearAuth(); clearCache(); }
    sessionStorage.setItem('pk_alive', '1');
  } catch (e) { /* ignore */ }
})();

const AWAY_LIMIT_MS = 2 * 60 * 1000; // away from the app longer than this -> sign in again
let leaving = false;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const signedIn = !!user;

  // Phone Back button (installed app): sign out and leave the app, instead of moving between pages
  useEffect(() => {
    if (!signedIn || !isInstalled()) return undefined;
    try { window.history.pushState({ pkGuard: true }, '', window.location.href); } catch (e) { /* ignore */ }
    const onBack = () => {
      if (leaving) return;
      leaving = true;
      clearAuth(); clearCache(); setUser(null);
      const n = window.history.length - 1;
      try { if (n > 0) window.history.go(-n); } catch (e) { /* ignore */ }
      setTimeout(() => {
        try { window.history.back(); } catch (e) { /* ignore */ }
        setTimeout(() => { leaving = false; window.location.replace('/login'); }, 500);
      }, 250);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, [signedIn]);

  // Left the app for a while (home button, another app): sign in again on return
  useEffect(() => {
    if (!signedIn || !isInstalled()) return undefined;
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      if (away > AWAY_LIMIT_MS) { clearAuth(); clearCache(); setUser(null); window.location.replace('/login'); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [signedIn]);

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

  const logout = () => {
    clearAuth();
    clearCache(); // never leave one user's saved data on the phone
    setUser(null);
    resetHistoryToLogin();
  };

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
