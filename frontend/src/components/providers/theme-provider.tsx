"use client";

import { useEffect } from "react";

import { api } from "@/lib/api";
import { useThemeStore } from "@/store/theme-store";

type ThemeProviderProps = {
  children: React.ReactNode;
  initialConfig?: {
    primaryColor?: string;
    sidebarColor?: string;
    logoUrl?: string | null;
  };
};

export function ThemeProvider({ children, initialConfig }: ThemeProviderProps) {
  const primaryColor = useThemeStore((state) => state.primaryColor);
  const sidebarColor = useThemeStore((state) => state.sidebarColor);
  const hydrateTheme = useThemeStore((state) => state.hydrateTheme);

  useEffect(() => {
    if (initialConfig) hydrateTheme(initialConfig);
    api
      .get("/tenant/config")
      .then((res) => {
        hydrateTheme({
          primaryColor: res.data.primary_color,
          sidebarColor: res.data.sidebar_color,
          logoUrl: res.data.logo_url,
        });
      })
      .catch(() => undefined);
  }, [hydrateTheme, initialConfig]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-color", primaryColor);
    root.style.setProperty("--sidebar-bg", sidebarColor);
  }, [primaryColor, sidebarColor]);

  return <>{children}</>;
}
