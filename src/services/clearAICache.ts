// Run this ONCE then delete it.
// Add to _layout.tsx useEffect temporarily:
//
//   import { clearAICache } from '@/src/services/clearAICache';
//   useEffect(() => { clearAICache(); }, []);

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearAICache() {
  await AsyncStorage.multiRemove([
    'eco_ai_suggestions',
    'eco_ai_cooldown',
  ]);
  console.log('✅ AI cache cleared');
}
