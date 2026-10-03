import { create } from "zustand";

// Transient UI state shared across the shell (not persisted).

type UIState = {
  cartOpen: boolean;
  menuOpen: boolean;
  /** The product on screen, so the WhatsApp button can mention it. */
  whatsappProduct: { name: string; url: string } | null;
  /** The mobile sticky add-to-cart bar is showing (the WhatsApp button moves up). */
  stickyBar: boolean;
  openCart: () => void;
  closeCart: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  setWhatsappProduct: (product: { name: string; url: string } | null) => void;
  setStickyBar: (visible: boolean) => void;
};

export const useUI = create<UIState>()((set) => ({
  cartOpen: false,
  menuOpen: false,
  whatsappProduct: null,
  stickyBar: false,
  openCart: () => set({ cartOpen: true, menuOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  setWhatsappProduct: (product) => set({ whatsappProduct: product }),
  setStickyBar: (visible) => set({ stickyBar: visible }),
}));
