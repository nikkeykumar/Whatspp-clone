import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStor = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (userData) => set({ user: userData, isAuthenticated: true }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "User-storage",
      getStorage: () => localStorage,
    }
  )
);
