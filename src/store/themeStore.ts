// src/store/themeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AccentKey, DEFAULT_ACCENT } from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  accentKey: AccentKey;
  _hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (key: AccentKey) => void;
  setHydrated: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      accentKey: DEFAULT_ACCENT,
      _hydrated: false,
      setMode:    (mode)      => set({ mode }),
      setAccent:  (accentKey) => set({ accentKey }),
      setHydrated: ()         => set({ _hydrated: true }),
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode, accentKey: state.accentKey }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);