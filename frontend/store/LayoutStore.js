import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LayoutStore = create(
  persist(
    (set) => ({
      activeTab: "chats",
      selectedContact: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedContact: (contact) => set({ selectedContact: contact }),
    }),
    {
      name: "Layout-storage",
      getStorage: () => localStorage,
    }
  )
);
