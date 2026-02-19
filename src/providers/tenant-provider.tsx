"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";

type TenantThemeConfig = {
  primary: string;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
};

type TenantConfig = {
  tenantId: string;
  name: string;
  logoUrl?: string;
  theme: TenantThemeConfig;
};

type TenantContextValue = {
  config: TenantConfig | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const applyTheme = (theme: TenantThemeConfig) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--muted", theme.muted);
};

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<TenantConfig>("/tenant/config");
      setConfig(response.data);
      applyTheme(response.data.theme);
    } catch (error) {
      console.error("Falha ao carregar configuração do tenant", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(
    () => ({
      config,
      isLoading,
      refresh,
    }),
    [config, isLoading],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant deve ser usado dentro de TenantProvider");
  }
  return context;
}
