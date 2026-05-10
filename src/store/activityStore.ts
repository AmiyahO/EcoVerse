// src/store/activityStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkLevelUp } from '@/src/utils/levelSystem';

export type EcoScoreSnapshot = {
  weekKey: string;   // e.g. "2026-W09"
  score: number;
  label: string;     // e.g. "W9"
};

export type ActivityCategory =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'electricity'
  | 'water';

export type Activity = {
  id: string;
  category: ActivityCategory;
  steps?: number;
  distance?: number;
  duration?: number;
  kwhSaved?: number;
  litersSaved?: number;
  billId?: string;
  source?: 'manual' | 'health_connect';
  date: string;
  /** CO₂ saved in kg — stored at log time so CO₂ challenges can read it directly. */
  co2Saved?: number;
  /** EcoTokens earned — stored at log time for tokens-based challenge progress. */
  tokensEarned?: number;
};

function getCurrentWeekKey(): string {
  const now    = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().split('T')[0];
}

type ActivityState = {
  activities: Activity[];
  celebrated: boolean;
  celebratedWeek: string | null;
  userRegion: string;
  userProfile: {
    displayName: string;
    email: string;
    photoURL: string | null;
    weeklyTarget: number;
    tokens: number;
    totalCarbonSaved: number;
  } | null;
  _hasHydrated: boolean;
  levelUpPending: boolean;
  pendingLevel: number;
  // Not persisted — resets on every cold boot.
  // Prevents level-up firing on the initial Firestore snapshot that populates
  // the profile (where prevTokens=0 → newTokens=1500 looks like a level-up).
  _profileLoaded: boolean;
  ecoScoreSnapshots: EcoScoreSnapshot[];

  setActivities:            (activities: Activity[]) => void;
  addActivity:              (activity: Activity) => void;
  removeActivity:           (id: string) => void;
  duplicateActivity:        (id: string) => Activity | null;
  clearActivities:          () => void;
  updateActivity:           (id: string, updatedActivity: Partial<Activity>) => void;
  getActivityById:          (id: string) => Activity | undefined;
  setCelebrated:            (val: boolean) => void;
  checkAndResetCelebration: () => void;
  setUserRegion:            (region: string) => void;
  setUserProfile:           (profile: { displayName: string; email: string; photoURL: string | null; weeklyTarget: number; tokens: number; totalCarbonSaved: number }) => void;
  setHasHydrated:           () => void;
  triggerLevelUp:           (newLevel: number) => void;
  clearLevelUp:             () => void;
  setEcoScoreSnapshots:     (snapshots: EcoScoreSnapshot[]) => void;
};

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities:     [],
      celebrated:     false,
      celebratedWeek: null,
      userRegion:     'GLOBAL_AVG',
      userProfile:    null,
      _hasHydrated:   false,
      levelUpPending: false,
      pendingLevel:   0,
      _profileLoaded: false,
      ecoScoreSnapshots: [],

      setActivities: (activities) => set({ activities }),

      addActivity: (activity) =>
        set(state => ({ activities: [...state.activities, activity] })),

      removeActivity: (id) =>
        set(state => ({ activities: state.activities.filter(a => a.id !== id) })),

      // Returns the new activity so the caller can persist it to Firestore
      duplicateActivity: (id) => {
        const original = get().activities.find(a => a.id === id);
        if (!original) return null;
        const copy: Activity = {
          ...original,
          id:   `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: new Date().toISOString(),
        };
        set(state => ({ activities: [...state.activities, copy] }));
        return copy;
      },

      // Reset _profileLoaded on sign-out so the next sign-in starts fresh
      clearActivities: () => set({ activities: [], _profileLoaded: false }),

      updateActivity: (id, updatedActivity) =>
        set(state => ({
          activities: state.activities.map(a =>
            a.id === id ? { ...a, ...updatedActivity } : a
          ),
        })),

      getActivityById: (id) => get().activities.find(a => a.id === id),

      setCelebrated: (val) =>
        set({ celebrated: val, celebratedWeek: val ? getCurrentWeekKey() : null }),

      checkAndResetCelebration: () => {
        const { celebratedWeek } = get();
        if (celebratedWeek !== getCurrentWeekKey()) {
          set({ celebrated: false, celebratedWeek: null });
        }
      },

      setUserRegion: (region) => set({ userRegion: region }),

      setUserProfile: (profile) =>
        set((state) => {
          const isFirstLoad = !state._profileLoaded;

          // Always mark as loaded so subsequent calls can check level-up
          const base = { userProfile: profile, _profileLoaded: true };

          // Only check for level-up on SUBSEQUENT token increases,
          // never on the initial cold-boot hydration from Firestore.
          if (!isFirstLoad && state._hasHydrated) {
            const prevTokens = state.userProfile?.tokens ?? 0;
            const newTokens  = profile.tokens ?? 0;
            if (newTokens > prevTokens) {
              const levelUp = checkLevelUp(prevTokens, newTokens - prevTokens);
              if (levelUp !== null) {
                return { ...base, levelUpPending: true, pendingLevel: levelUp };
              }
            }
          }

          return base;
        }),

      setHasHydrated: () => set({ _hasHydrated: true }),

      triggerLevelUp: (newLevel) => set({ levelUpPending: true, pendingLevel: newLevel }),

      clearLevelUp:   ()          => set({ levelUpPending: false, pendingLevel: 0 }),

      setEcoScoreSnapshots: (snapshots) => set({ ecoScoreSnapshots: snapshots }),
    }),
    {
      name:    'activity-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist celebration state — everything else rehydrates from Firestore
      partialize: state => ({
        celebrated:     state.celebrated,
        celebratedWeek: state.celebratedWeek,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated();
      },
    }
  )
);