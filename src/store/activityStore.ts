// activityStore.ts
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
  distance?: number; // in kilometers
  duration?: number; // in minutes

  // utilities
  kwhSaved?: number;
  litersSaved?: number;

  // bill reference
  billId?: string; 

  date: string;
};

// Helper to get the current week's Sunday as a string key
function getCurrentWeekKey(): string {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().split('T')[0]; // e.g. "2026-02-15"
}

type ActivityState = {
  activities: Activity[];
  celebrated: boolean;
  celebratedWeek: string | null; // tracks which week was celebrated
  userRegion: string;
  userProfile: {
    displayName: string;
    email: string;
    photoURL: string | null;
    weeklyTarget: number;
  } | null;
  _hasHydrated: boolean;
  
  setActivities: (activities: Activity[]) => void; // Add this
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  clearActivities: () => void;
  updateActivity: (id: string, updatedActivity: Partial<Activity>) => void;
  getActivityById: (id: string) => Activity | undefined;
  setCelebrated: (val: boolean) => void;
  checkAndResetCelebration: () => void; // call on app load
  setUserRegion: (region: string) => void;
  setUserProfile: (profile: { displayName: string; email: string; photoURL: string | null; weeklyTarget: number }) => void;
  setHasHydrated: () => void;
};

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      celebrated: false,
      celebratedWeek: null,
      userRegion: 'GLOBAL_AVG',
      userProfile: null,
      _hasHydrated: false,

      setActivities: (activities) => set({ activities }),

      addActivity: (activity) =>
        set((state) => ({
          activities: [...state.activities, activity],
        })),

      removeActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
        })),

      clearActivities: () => set({ activities: [] }),

      updateActivity: (id, updatedActivity) =>
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id ? { ...a, ...updatedActivity } : a
          ),
        })),

      getActivityById: (id) => {
        return get().activities.find((a) => a.id === id);
      },

      setCelebrated: (val) =>
        set({ celebrated: val, celebratedWeek: val ? getCurrentWeekKey() : null }),

      setUserRegion: (region) => set({ userRegion: region }),

      // Call this on app load to reset if it's a new week
      checkAndResetCelebration: () => {
        const { celebratedWeek } = get();
        const currentWeek = getCurrentWeekKey();
        if (celebratedWeek !== currentWeek) {
          set({ celebrated: false, celebratedWeek: null });
        }
      },

      setUserProfile: (profile) => set({ userProfile: profile }),

      setHasHydrated: () => set({ _hasHydrated: true }),
  }),
    {
      name: 'activity-store', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist celebration state, NOT activities
      // Activities come from Firestore so we don't want stale local data
      partialize: (state) => ({
        celebrated: state.celebrated,
        celebratedWeek: state.celebratedWeek,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated();
      },
    }
  )
);

