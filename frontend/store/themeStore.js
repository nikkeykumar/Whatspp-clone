import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useThemeStor = create(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "Theme-storage",
      getStorage: () => localStorage,
    }
  )
);
