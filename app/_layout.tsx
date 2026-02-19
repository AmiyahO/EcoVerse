// layout for the root navigator
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { auth, db } from '@/src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore'; // Added missing imports
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash screen visible while we fetch Firebase data
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const [user, setUser] = useState<any>(null);
  const [hasFinishedOnboarding, setHasFinishedOnboarding] = useState<boolean | null>(null);  
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setActivities, clearActivities } = useActivityStore(); // Get actions from store

  // Listen for Firebase auth state
  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;
    let unsubscribeActivities: (() => void) | undefined; // Added for activities

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      // Clean up any existing doc listener when auth state changes and previous user data
      // 1. KILL the listener IMMEDIATELY on any auth change
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined; 
      }

      if (unsubscribeActivities) unsubscribeActivities();
      clearActivities(); // Clear the store so the new user doesn't see old data
      
      if (currentUser) {
        setUser(currentUser);
        
        // LISTEN to the document in real-time
        const userDocRef = doc(db, "users", currentUser.uid);

        // 2. Fixed syntax: combined the success and error callbacks correctly
        unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setHasFinishedOnboarding(data.hasFinishedOnboarding ?? false);
          }
          setLoading(false);
          }, (error) => {
            console.error(error);
            setLoading(false)
          });

          // 2. LISTEN TO USER'S ACTIVITIES
          // REAL-TIME ACTIVITY SYNC
          // This ensures the dashboard updates automatically when you add/delete
          const activitiesRef = collection(db, "users", currentUser.uid, "activities");
          const q = query(activitiesRef, orderBy("date", "desc"));

          unsubscribeActivities = onSnapshot(q, (snapshot) => {
            const firebaseData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as any[];

            setActivities(firebaseData); // Update the store with REAL Firebase data
        });
      } else {
        // Clear everything immediately
        setUser(null);
        setHasFinishedOnboarding(null);
        setLoading(false);
      }
    });

    // CLEANUP FUNCTION for first useEffect
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeActivities) unsubscribeActivities();
    };
  }, []);

  // 4. Navigation Logic Effect
  useEffect(() => {
    if (colors.background) {
      SystemUI.setBackgroundColorAsync(colors.background);
    }
    
    // Wait until loading is finished and user state is known
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (hasFinishedOnboarding === false) {
        router.replace('/onboarding');
      } else if (hasFinishedOnboarding === true) {
        router.replace('/(tabs)');
      }
    }
  }, [user, hasFinishedOnboarding, loading]);

  // Prevent "flashing" Step 1: If we are still loading, OR if we have a user 
  // but are still waiting for their Firestore onboarding status to arrive.
  useEffect(() => {
    async function checkSplash() {
      if (!loading && (user === null || hasFinishedOnboarding !== null)) {
        // Only hide when we are 100% sure where the user is going
        // await SplashScreen.hideAsync();
      }
    }
    checkSplash();
  }, [loading, hasFinishedOnboarding, user]);

  if (loading || (user && hasFinishedOnboarding === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // REMEMBER TO REMOVE
  console.log("Current State:", { user: !!user, hasFinishedOnboarding })

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Wrap in a View with theme color to prevent transition flashing */}
    <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ 
          headerShown: false ,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background }
        }}>
          {!user ? (
            // Not signed in → Login screen
            <Stack.Screen name="login" />
          ) : hasFinishedOnboarding === false ? (
            // New user → Onboarding
            <Stack.Screen name="onboarding/index" />  
          ) : (
            // Existing user → Tabs & other stack screens
            <Stack.Screen name="(tabs)" />
          )}

          {/* Screens that can be accessed regardless of finish status or inside tabs */}
          <Stack.Screen name="settings" />
          <Stack.Screen 
            name="edit-profile" 
            options={{ 
              presentation: 'modal', // Makes it slide up from the bottom like a sheet
              animation: 'fade_from_bottom' 
            }} 
          />
        </Stack>
      </View>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashImage: { width: '100%', height: '100%' },
});