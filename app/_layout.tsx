// layout for the root navigator
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { auth, db } from '@/src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Added missing imports
import { useAppTheme } from '@/hooks/useAppTheme';

export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const [user, setUser] = useState<any>(null);
  const [hasFinishedOnboarding, setHasFinishedOnboarding] = useState<boolean | null>(null);  
  const [loading, setLoading] = useState(true);

  // Listen for Firebase auth state
  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
  //     try {
  //       if (currentUser) {
  //           // 1. Get the user document from Firestore
  //           const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            
  //           if (userDoc.exists() && userDoc.data().hasFinishedOnboarding) {
  //             setHasFinishedOnboarding(true);
  //           } else {
  //             setHasFinishedOnboarding(false);
  //           }
  //           setUser(currentUser);
  //         } else {
  //             setUser(null);
  //             setHasFinishedOnboarding(null);
  //           }
  //     } catch (error) {
  //       console.error("Auth state change error:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  // });
  // return () => unsubscribe();
  // }, []);

  // if (loading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  //       <ActivityIndicator size="large" color={colors.tint} />
  //     </View>
  //   );
  // }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* {!user ? ( */}
        {/* BYPASS: Change this to true to skip login and onboarding */}
        {false ? (
          // Not signed in → Login screen
          <Stack.Screen name="login" />
        // ) : hasFinishedOnboarding === false ? (
        //   // New user → Onboarding
        //   <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />  
        ) : (
          // Existing user → Tabs & other stack screens
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="activity/add" options={{ title: 'Add Activity' }} />
            <Stack.Screen name="activity/details" options={{ title: 'Details' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </>
        )}
      </Stack>

      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashImage: { width: '100%', height: '100%' },
});
