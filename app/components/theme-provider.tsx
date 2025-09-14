'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Scheme = 'light' | 'dark';
type Preference = Scheme | 'system';

type ThemeCtx = {
  theme: Scheme;
  preference: Preference;
  toggleTheme: () => void;
  setTheme: (next: Scheme) => void;
  useSystem: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

function apply(theme: Scheme){
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }){
  const [preference, setPreference] = useState<Preference>('system');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const mql = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const sys = !!mql?.matches;
    setSystemDark(sys);

    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      setPreference(stored as Preference);
    } else {
      // First time: default to system and persist
      setPreference('system');
      try { localStorage.setItem('theme', 'system'); } catch {}
    }

    const onChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
      // When following system, reflect changes immediately
      // Local storage stays 'system' to indicate the source of truth
    };
    mql?.addEventListener?.('change', onChange);
    return () => mql?.removeEventListener?.('change', onChange);
  }, []);

  const theme: Scheme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  // Apply theme class whenever resolved theme changes
  useEffect(() => {
    apply(theme);
  }, [theme]);

  const value = useMemo<ThemeCtx>(() => ({
    theme,
    preference,
    toggleTheme: () => {
      const next: Scheme = theme === 'dark' ? 'light' : 'dark';
      setPreference(next);
      try { localStorage.setItem('theme', next); } catch {}
      apply(next);
    },
    setTheme: (next: Scheme) => {
      setPreference(next);
      try { localStorage.setItem('theme', next); } catch {}
      apply(next);
    },
    useSystem: () => {
      setPreference('system');
      try { localStorage.setItem('theme', 'system'); } catch {}
      apply(systemDark ? 'dark' : 'light');
    }
  }), [theme, preference, systemDark]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(){
  const ctx = useContext(Ctx);
  if(!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
