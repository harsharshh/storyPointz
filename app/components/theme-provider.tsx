'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Scheme = 'light' | 'dark';
type Preference = Scheme | null;

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
  const [preference, setPreference] = useState<Preference>(null);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const mql = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const sys = !!mql?.matches;
    setSystemDark(sys);

    if(stored === 'dark' || stored === 'light'){
      setPreference(stored);
      apply(stored);
    } else {
      apply(sys ? 'dark' : 'light');
    }

    const onChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
      if(preference === null){
        apply(e.matches ? 'dark' : 'light');
      }
    };
    mql?.addEventListener?.('change', onChange);
    return () => mql?.removeEventListener?.('change', onChange);
  }, []);

  const theme: Scheme = preference ?? (systemDark ? 'dark' : 'light');

  const value = useMemo<ThemeCtx>(() => ({
    theme,
    preference,
    toggleTheme: () => {
      const next: Scheme = theme === 'dark' ? 'light' : 'dark';
      setPreference(next);
      localStorage.setItem('theme', next);
      apply(next);
    },
    setTheme: (next: Scheme) => {
      setPreference(next);
      localStorage.setItem('theme', next);
      apply(next);
    },
    useSystem: () => {
      setPreference(null);
      localStorage.removeItem('theme');
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