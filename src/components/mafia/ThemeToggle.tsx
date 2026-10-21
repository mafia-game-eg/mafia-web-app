"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "light" ? "#fafafa" : "#0f0c1a");
    setTheme(next);
  }

  return (
    <button onClick={toggle} className={className}>
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-[var(--gold)]" />
      ) : (
        <Moon className="h-5 w-5 text-[var(--gold)]" />
      )}
      الوضع: {theme === "dark" ? "داكن" : "فاتح"}
    </button>
  );
}