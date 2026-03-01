// src/store/themeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  _hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  setHydrated: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      _hydrated: false,
      setMode: (mode) => set({ mode }),
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }), // don't persist _hydrated
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);