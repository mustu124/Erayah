import { create } from "zustand";

// Transient UI state shared across the shell (not persisted).

type UIState = {
  cartOpen: boolean;
  menuOpen: boolean;
  /** What the floating WhatsApp button asks about (e.g. the product on screen). */
  whatsappTopic: string | null;
  openCart: () => void;
  closeCart: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  setWhatsappTopic: (topic: string | null) => void;
};

export const useUI = create<UIState>()((set) => ({
  cartOpen: false,
  menuOpen: false,
  whatsappTopic: null,
  openCart: () => set({ cartOpen: true, menuOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  setWhatsappTopic: (topic) => set({ whatsappTopic: topic }),
}));
