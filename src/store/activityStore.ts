// src/store/activityStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkLevelUp } from '@/src/utils/levelSystem';

export type ActivityCategory =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'electricity'
  | 'water';

export type Activity = {
  id: string;
  category: ActivityCategory;

  // movement
  steps?: number;
  distance?: number;   // km
  duration?: number;   // minutes

  // utilities
  kwhSaved?: number;
  litersSaved?: number;

  // references
  billId?: string;

  // origin — 'health_connect' means data was auto-filled from HC
  source?: 'manual' | 'health_connect';

  date: string;
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
  levelUpPending: boolean;   // true → LevelUpModal should show
  pendingLevel: number;      // the new level to display in the modal

  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  clearActivities: () => void;
  updateActivity: (id: string, updatedActivity: Partial<Activity>) => void;
  getActivityById: (id: string) => Activity | undefined;
  setCelebrated: (val: boolean) => void;
  checkAndResetCelebration: () => void;
  setUserRegion: (region: string) => void;
  setUserProfile: (profile: { displayName: string; email: string; photoURL: string | null; weeklyTarget: number; tokens: number; totalCarbonSaved: number }) => void;
  setHasHydrated: () => void;
  triggerLevelUp: (newLevel: number) => void;
  clearLevelUp: () => void;
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

      setActivities: (activities) => set({ activities }),

      addActivity: (activity) =>
        set(state => ({ activities: [...state.activities, activity] })),

      removeActivity: (id) =>
        set(state => ({ activities: state.activities.filter(a => a.id !== id) })),

      clearActivities: () => set({ activities: [] }),

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

      setUserRegion:  (region)  => set({ userRegion: region }),

      setUserProfile: (profile) =>
        set((state) => {
          const prevTokens = state.userProfile?.tokens ?? 0;
          const newTokens  = profile?.tokens ?? 0;

          // Only check for level-up when tokens genuinely increased this session
          // and the store has already hydrated (not a cold boot).
          if (state._hasHydrated && newTokens > prevTokens) {
            const levelUp = checkLevelUp(prevTokens, newTokens - prevTokens);
            if (levelUp !== null) {
              return { userProfile: profile, levelUpPending: true, pendingLevel: levelUp };
            }
          }

          return { userProfile: profile };
        }),

      setHasHydrated: () => set({ _hasHydrated: true }),

      triggerLevelUp: (newLevel: number) =>
        set({ levelUpPending: true, pendingLevel: newLevel }),

      clearLevelUp: () =>
        set({ levelUpPending: false, pendingLevel: 0 }),
    }),
    {
      name:    'activity-store',
      storage: createJSONStorage(() => AsyncStorage),
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