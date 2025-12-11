// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { MOOD_THEMES, type MoodType } from "../../constants";

type ThemeContextType = { mood: MoodType; setMood: (m: MoodType) => void };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const saved = typeof window !== "undefined" ? (localStorage.getItem("vibedesk_mood") as MoodType | null) : null;
  const [mood, setMoodState] = useState<MoodType>(saved ?? ("Neutral" as MoodType));

  const applyTheme = (m: MoodType) => {
    const theme = MOOD_THEMES[m];
    if (!theme) return;
    const r = document.documentElement;
    
    // Add transition class for smooth color changes
    r.classList.add("theme-transitioning");
    
    r.style.setProperty("--bg-gradient-1", theme.colors.background.split(",")[0] || theme.colors.background);
    r.style.setProperty("--bg-gradient-2", theme.colors.background.includes(",") ? theme.colors.background.split(",")[1] : theme.colors.background);
    r.style.setProperty("--accent-color", theme.colors.primary);
    r.style.setProperty("--blob-1", theme.colors.palette?.[0] || theme.colors.background);
    
    // Remove transition class after animation completes
    setTimeout(() => r.classList.remove("theme-transitioning"), 400);
  };

  const setMood = (m: MoodType) => {
    setMoodState(m);
    try { localStorage.setItem("vibedesk_mood", m); } catch {}
    applyTheme(m);
  };

  useEffect(() => { 
    applyTheme(mood); 
    /* eslint-disable-next-line react-hooks/exhaustive-deps */ 
  }, []);

  return <ThemeContext.Provider value={{ mood, setMood }}>{children}</ThemeContext.Provider>;
};
