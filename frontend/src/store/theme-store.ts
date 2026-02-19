import { create } from "zustand";

type ThemeState = {
  primaryColor: string;
  sidebarColor: string;
  logoUrl: string | null;
  isCollapsed: boolean;
  setPrimaryColor: (value: string) => void;
  setSidebarColor: (value: string) => void;
  setLogoUrl: (value: string | null) => void;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  hydrateTheme: (payload: Partial<Pick<ThemeState, "primaryColor" | "sidebarColor" | "logoUrl">>) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  primaryColor: "#0297A2",
  sidebarColor: "#0A2B4D",
  logoUrl: null,
  isCollapsed: false,
  setPrimaryColor: (value) => set({ primaryColor: value }),
  setSidebarColor: (value) => set({ sidebarColor: value }),
  setLogoUrl: (value) => set({ logoUrl: value }),
  setCollapsed: (value) => set({ isCollapsed: value }),
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  hydrateTheme: (payload) =>
    set((state) => ({
      primaryColor: payload.primaryColor ?? state.primaryColor,
      sidebarColor: payload.sidebarColor ?? state.sidebarColor,
      logoUrl: payload.logoUrl ?? state.logoUrl,
    })),
}));
