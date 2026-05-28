// This function clears the AI cache by removing specific keys from AsyncStorage. 
// It can be used to reset the AI suggestions and cooldown state, for example after a user logs out or if there's a need to refresh the AI data. To use this function, simply import it and call clearAICache() when you want to clear the cache.
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearAICache() {
  await AsyncStorage.multiRemove([
    'eco_ai_suggestions',
    'eco_ai_cooldown',
  ]);
  console.log('✅ AI cache cleared');
}

// Add to _layout.tsx useEffect temporarily:
//   import { clearAICache } from '@/src/services/clearAICache';
//   useEffect(() => { clearAICache(); }, []);