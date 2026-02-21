// layout for the root navigator
import { View, ActivityIndicator } from 'react-native';
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

export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hasFinishedOnboarding, setHasFinishedOnboarding] = useState<boolean | null>(null);  
  const [userDocReady, setUserDocReady] = useState(false);
  const [activitiesReady, setActivitiesReady] = useState(false);
  const loading = !userDocReady || !activitiesReady;  const { setActivities, clearActivities, setUserRegion, setUserProfile } = useActivityStore(); // Get actions from store
  const checkAndResetCelebration = useActivityStore((s) => s.checkAndResetCelebration);

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
            setUserRegion(data.region || 'GLOBAL_AVG');
            setUserProfile({
              displayName: data.displayName || '',
              email: data.email || currentUser.email || '',
              photoURL: data.photoURL || null,
              weeklyTarget: data.weeklyTarget || 500,
            });
          }
          setUserDocReady(true); // was setLoading(false)
        }, (error) => {
          console.error(error);
          setUserDocReady(true);
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
            setActivitiesReady(true);
        });
      } else {
        // Clear everything immediately
        setUser(null);
        setHasFinishedOnboarding(null);
        setUserDocReady(true);   // was setLoading(false)
        setActivitiesReady(true);
      }
    });

    // CLEANUP FUNCTION for first useEffect
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeActivities) unsubscribeActivities();
    };
  }, []);

  useEffect(() => {
    if (colors.background) {
      SystemUI.setBackgroundColorAsync(colors.background);
    }
  }, [colors.background]);

  useEffect(() => {
  checkAndResetCelebration();
}, []); // runs once on app load

  // navigation useEffect
  useEffect(() => {
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

  if (loading ) {
    return (
      <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: scheme === 'dark' ? '#000000' : '#F9FAFB' 
        }}>
        <ActivityIndicator 
          size="large" 
          color={scheme === 'dark' ? '#34C9C9' : '#2E7D32'} />
      </View>
    );
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Wrap in a View with theme color to prevent transition flashing */}
    <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack 
        screenOptions={{ 
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