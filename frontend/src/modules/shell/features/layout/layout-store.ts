import { create } from "zustand";
import { persist } from "zustand/middleware";

type LayoutState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: "keepitbalance-layout", partialize: ({ sidebarCollapsed }) => ({ sidebarCollapsed }) },
  ),
);
