// ecoLogic.ts
import { Activity } from '@/src/store/activityStore';

export const WEEKLY_TOKEN_TARGET = 500;

// calculate tokens based on activity type and metrics (Gamified)
export function calculateTokens(activity: Activity): number {
  switch (activity.category) {
    case 'walking':
      return Math.floor((activity.steps ?? 0) / 100);

      case 'running':
      return Math.floor((activity.distance ?? 0) * 20);

    case 'cycling':
      return Math.floor((activity.distance ?? 0) / 20);

    case 'electricity':
      return Math.floor((activity.kwhSaved ?? 0) / 0.5);

    case 'water':
      return Math.floor((activity.litersSaved ?? 0) / 2);

    default:
      return 0;
  }
}

// CO₂ logic based on activity type and metrics
export function calculateCarbonSaved(activity: Activity): number {
  switch (activity.category) {
    case 'walking': {
      const distanceKm =
        activity.distance ??
        ((activity.steps ?? 0) * 0.78) / 1000;

      return distanceKm * 0.192;
    }

    // kg CO₂ avoided vs car
    case 'running':
    case 'cycling': {
      const km = activity.distance ?? 0;
      return km * 0.192; // kg CO₂ per km
    }

    case 'electricity':
      return (activity.kwhSaved ?? 0) * 0.233;

    case 'water':
      return (activity.litersSaved ?? 0) * 0.000344;

    default:
      return 0;
  }
}

// determine eco zone based on score
export function getEcoZone(score: number) {
  if (score < 50) 
    return { label: 'Red', message: 'Try logging more eco-friendly activities this week 🌱' };
  
  if (score < 75) 
    return { label: 'Yellow', message: 'You’re doing well — keep your streak going 💛' };
  
  return { label: 'Green', message: 'Amazing! You’re making a real impact 🌍' };
}