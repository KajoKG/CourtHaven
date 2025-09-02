"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  // 'system' = slijedi OS; 'light' ili 'dark' = forsirano
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (typeof window !== "undefined" && (localStorage.getItem("theme") as any)) || "light"
  );

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
