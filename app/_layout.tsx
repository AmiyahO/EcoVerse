// _layout.tsx
import { View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import * as SystemUI from 'expo-system-ui';

export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authResolved, setAuthResolved] = useState(false); // has Firebase told us auth state?
  const [hasFinishedOnboarding, setHasFinishedOnboarding] = useState<boolean | null>(null);
  const [userDocReady, setUserDocReady] = useState(false);
  const [activitiesReady, setActivitiesReady] = useState(false);
  // freshLogin: true when user just signed in this session (skip skeleton, go straight to route)
  const freshLogin = useRef(false);
  // Only show data-loading skeleton when signed in AND it's not a fresh login/signup
  const loading = !authResolved || (!!user && (!userDocReady || !activitiesReady) && !freshLogin.current);

  const { setActivities, clearActivities, setUserRegion, setUserProfile } = useActivityStore();
  const checkAndResetCelebration = useActivityStore(s => s.checkAndResetCelebration);

  // Tracks whether we've done the initial full load yet
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;
    let unsubscribeActivities: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribeDoc)        { unsubscribeDoc();        unsubscribeDoc = undefined; }
      if (unsubscribeActivities) { unsubscribeActivities(); unsubscribeActivities = undefined; }

      clearActivities();
      initialLoadDone.current = false;

      setAuthResolved(true);

      if (currentUser) {
        setUser(currentUser);
        freshLogin.current = true; // skip skeleton — we just authenticated

        // ── User profile listener ──
        unsubscribeDoc = onSnapshot(
          doc(db, 'users', currentUser.uid),
          (docSnap) => {
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
            setUserDocReady(true);
          },
          (error) => { console.error(error); setUserDocReady(true); }
        );

        // ── Activities listener ──
        const q = query(
          collection(db, 'users', currentUser.uid, 'activities'),
          orderBy('date', 'desc')
        );

        unsubscribeActivities = onSnapshot(
          q,
          { includeMetadataChanges: false },
          (snapshot) => {
            if (!initialLoadDone.current) {
              // First snapshot: full replace from server data
              // Filter out soft-deleted activities
              const firebaseData = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((d: any) => !d.deleted) as any[];
              setActivities(firebaseData);
              initialLoadDone.current = true;
              setActivitiesReady(true);
              return;
            }

            // Subsequent snapshots: apply only what changed.
            // This is the key fix — we never call setActivities again after initial load,
            // so a deleted doc can't get written back into the store.
            const store = useActivityStore.getState();
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const data = change.doc.data();
                if (data.deleted) return; // skip soft-deleted
                const exists = store.activities.some(a => a.id === change.doc.id);
                if (!exists) {
                  store.addActivity({ id: change.doc.id, ...data } as any);
                }
              } else if (change.type === 'modified') {
                const data = change.doc.data();
                if (data.deleted) {
                  // Soft-deleted — remove from local store
                  store.removeActivity(change.doc.id);
                } else {
                  store.updateActivity(change.doc.id, { id: change.doc.id, ...data });
                }
              } else if (change.type === 'removed') {
                store.removeActivity(change.doc.id);
              }
            });
          }
        );
      } else {
        setUser(null);
        setHasFinishedOnboarding(null);
        setUserDocReady(true);
        setActivitiesReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc)        unsubscribeDoc();
      if (unsubscribeActivities) unsubscribeActivities();
    };
  }, []);

  useEffect(() => {
    if (colors.background) SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => { checkAndResetCelebration(); }, []);

  useEffect(() => {
    if (!authResolved) return;
    // For fresh logins, route as soon as we know onboarding status (don't wait for activities)
    const readyToRoute = freshLogin.current
      ? (userDocReady && hasFinishedOnboarding !== null)
      : !loading;

    if (readyToRoute) {
      if (!user) {
        freshLogin.current = false;
        router.replace('/login');
      } else if (hasFinishedOnboarding === false) {
        freshLogin.current = false;
        router.replace('/onboarding');
      } else if (hasFinishedOnboarding === true) {
        freshLogin.current = false;
        router.replace('/(tabs)');
      }
      // null = doc not written yet (deleted account re-auth), wait
    }
  }, [user, hasFinishedOnboarding, loading, authResolved, userDocReady]);

  if (loading) {
    const bg      = scheme === 'dark' ? '#0B0F0C' : '#F9FAFB';
    const shimmer  = scheme === 'dark' ? '#1a1a1a' : '#E5E7EB';
    const shimmer2 = scheme === 'dark' ? '#222'    : '#F3F4F6';
    // If auth hasn't resolved yet, no user, or fresh login — show plain background, never skeleton
    if (!authResolved || !user || freshLogin.current) {
      return <View style={{ flex: 1, backgroundColor: bg }} />;
    }
    return (
      <View style={{ flex: 1, backgroundColor: bg, padding: 20, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: shimmer }} />
          <View style={{ gap: 8 }}>
            <View style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: shimmer }} />
            <View style={{ width: 80,  height: 10, borderRadius: 5, backgroundColor: shimmer2 }} />
          </View>
        </View>
        <View style={{ width: '100%', height: 180, borderRadius: 20, backgroundColor: shimmer, marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, height: 90, borderRadius: 14, backgroundColor: shimmer }} />
          <View style={{ flex: 1, height: 90, borderRadius: 14, backgroundColor: shimmer }} />
        </View>
        <View style={{ width: '100%', height: 110, borderRadius: 14, backgroundColor: shimmer, marginBottom: 16 }} />
        <View style={{ width: '70%', height: 14, borderRadius: 7, backgroundColor: shimmer2, marginBottom: 10 }} />
        <View style={{ width: '50%', height: 14, borderRadius: 7, backgroundColor: shimmer2 }} />
      </View>
    );
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {!user ? (
            <Stack.Screen name="login" />
          ) : hasFinishedOnboarding === false ? (
            <Stack.Screen name="onboarding/index" />
          ) : (
            <Stack.Screen name="(tabs)" />
          )}
          <Stack.Screen name="settings" />
          <Stack.Screen
            name="edit-profile"
            options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
          />
        </Stack>
      </View>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}