"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  return stored === "dark" ? "dark" : "light";
}

export function useTheme() {
  // 'system' (OS) is not persisted here; default to 'light' when unset/SSR
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
