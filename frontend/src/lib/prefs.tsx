/**
 * Display preferences — theme (dark/light) and lite mode.
 *
 * Persisted in localStorage ("slr-theme", "slr-lite"). Theme defaults to
 * dark unless the user picked otherwise or their OS prefers light; the
 * pre-paint script in layout.tsx applies the class before first render.
 */
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "dark" | "light";
const THEME_KEY = "slr-theme";
const LITE_KEY = "slr-lite";

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function initialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = readStored(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initialLite(): boolean {
  if (typeof window === "undefined") return false;
  return readStored(LITE_KEY) === "1";
}

/* ---------------- theme ---------------- */

const ThemeCtx = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode — theme just won't persist */
    }
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

/* ---------------- lite mode ---------------- */

const LiteCtx = createContext<{ lite: boolean; toggleLite: () => void }>({
  lite: false,
  toggleLite: () => {},
});

export function LiteProvider({ children }: { children: ReactNode }) {
  const [lite, setLite] = useState<boolean>(initialLite);

  useEffect(() => {
    document.body.classList.toggle("lite", lite);
    try {
      window.localStorage.setItem(LITE_KEY, lite ? "1" : "0");
    } catch {
      /* private mode — preference just won't persist */
    }
  }, [lite]);

  const toggleLite = useCallback(() => setLite((v) => !v), []);

  return <LiteCtx.Provider value={{ lite, toggleLite }}>{children}</LiteCtx.Provider>;
}

export function useLite() {
  return useContext(LiteCtx);
}
