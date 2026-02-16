// activityStore.ts
import { create } from 'zustand';

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

  date: string;
};

type ActivityState = {
  activities: Activity[];
  setActivities: (activities: Activity[]) => void; // Add this
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  clearActivities: () => void;
  updateActivity: (id: string, updatedActivity: Partial<Activity>) => void;
  getActivityById: (id: string) => Activity | undefined;
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],

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
  }

}));

