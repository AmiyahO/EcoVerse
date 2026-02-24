// src/store/activityStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  } | null;
  _hasHydrated: boolean;

  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  clearActivities: () => void;
  updateActivity: (id: string, updatedActivity: Partial<Activity>) => void;
  getActivityById: (id: string) => Activity | undefined;
  setCelebrated: (val: boolean) => void;
  checkAndResetCelebration: () => void;
  setUserRegion: (region: string) => void;
  setUserProfile: (profile: { displayName: string; email: string; photoURL: string | null; weeklyTarget: number }) => void;
  setHasHydrated: () => void;
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
      setUserProfile: (profile) => set({ userProfile: profile }),
      setHasHydrated: ()        => set({ _hasHydrated: true }),
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