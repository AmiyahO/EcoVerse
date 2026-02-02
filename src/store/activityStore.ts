import { create } from 'zustand';

export type Activity = {
  id: string;
  type: string;
  steps?: number;
  distance?: number;
  date?: string;
};

type ActivityState = {
  activities: Activity[];
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  clearActivities: () => void;
  updateActivity: (id: string, updatedActivity: Partial<Activity>) => void;
  getActivityById: (id: string) => Activity | undefined;
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],

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
