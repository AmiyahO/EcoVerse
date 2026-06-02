// app/_layout.tsx
import { View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, setDoc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import * as SystemUI from 'expo-system-ui';
import { calculateTokens, calculateCarbonSaved, persistWeeklyEcoScore } from '@/src/utils/ecoLogic';
import {
  configureNotificationHandler,
  checkAndScheduleMissedDayNudge,
} from '@/src/services/notificationService';
configureNotificationHandler();
import AsyncStorage from '@react-native-async-storage/async-storage';
import { preloadSounds } from '@/src/utils/sfx';
import { WeeklyWinModal } from '@/components/WeeklyWinModal';

// ── EcoScore snapshot helpers ─────────────────────────────────────────────────

function getWeekKey(date: Date): string {
  // Sunday-based week, local time — matches getWeekRange() in ecoLogic.ts
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  sunday.setHours(0, 0, 0, 0);
  const y  = sunday.getFullYear();
  const m  = String(sunday.getMonth() + 1).padStart(2, '0');
  const d  = String(sunday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // e.g. "2026-05-03" (the Sunday)
}

function getWeekLabel(date: Date): string {
  // Week number that treats Sunday as the START of a new week (matching the
  // app's Sunday-based week boundary). On Sundays, advance one day to Monday
  // before computing the ISO week number — this bumps Sunday into the next
  // ISO week, which is what we want (Sunday May 17 → W21, not W20).
  const d = new Date(date);
  d.setHours(12, 0, 0, 0); // mid-day to avoid any DST edge
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sunday → advance to Monday
  const jan4 = new Date(d.getFullYear(), 0, 4);      // Jan 4 is always in W1
  const startW1 = new Date(jan4);
  startW1.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1)); // Monday of W1
  const weekNum = Math.floor((d.getTime() - startW1.getTime()) / (7 * 86400000)) + 1;
  return `W${weekNum}`;
}

function calcEcoScore(
  weekActivities: any[], weeklyTarget: number,
): number {
  const tokens = weekActivities.reduce((s: number, a: any) => s + calculateTokens(a), 0);
  const activeDays = new Set(weekActivities.map((a: any) => {
    const d = new Date(a.date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })).size;
  const uniqueCats = new Set(weekActivities.map((a: any) => a.category)).size;
  const base        = Math.min((tokens / Math.max(weeklyTarget, 1)) * 70, 70);
  const consistency = (activeDays / 7) * 20;
  const variety     = (uniqueCats / 3) * 10;
  return Math.min(100, Math.round(base + consistency + variety));
}

async function writeEcoScoreSnapshot(
  uid: string,
  activities: any[],
  weeklyTarget: number,
  userRegion: string,
): Promise<void> {
  const now     = new Date();
  const weekKey = getWeekKey(now);
  const label   = getWeekLabel(now);

  // Sunday 00:00 → Saturday 23:59 local time — same as getWeekRange(0)
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  const weekActs = activities.filter(a => {
    const t = new Date(a.date).getTime();
    return t >= sunday.getTime() && t <= saturday.getTime();
  });

  const score = calcEcoScore(weekActs, weeklyTarget);

  await setDoc(
    doc(collection(doc(db, 'users', uid), 'ecoScoreSnapshots'), weekKey),
    { weekKey, score, label, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

async function loadEcoScoreSnapshots(uid: string) {
  const snap = await getDocs(
    query(collection(doc(db, 'users', uid), 'ecoScoreSnapshots'), orderBy('updatedAt', 'desc'))
  );
  return snap.docs
    .map(d => d.data() as { weekKey: string; score: number; label: string; updatedAt: string })
    .slice(0, 12) // last 12 weeks max
    .reverse();   // oldest → newest for charting
}

export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [hasFinishedOnboarding, setHasFinishedOnboarding] = useState<boolean | null>(null);
  const [userDocReady, setUserDocReady] = useState(false);
  const [activitiesReady, setActivitiesReady] = useState(false);
  const activitiesForSnapshot = useRef<any[]>([]);
  const snapshotWritten = useRef(false);
  const readyFlags = useRef({ userDoc: false, activities: false });

  const freshLogin = useRef(false);
  // ── Prevents double-navigation: once _layout routes somewhere, it won't
  //    re-route until auth state actually changes again (e.g. a new sign-in).
  //    Without this, router.replace('/login') in settings AND the onAuthStateChanged
  //    null callback both call router.replace('/login'), causing the login screen
  //    to animate in twice after account deletion.
  const hasNavigated = useRef(false);

  const loading = !authResolved || (!!user && (!userDocReady || !activitiesReady) && !freshLogin.current);

  const [weeklyWin, setWeeklyWin] = useState<{
    rank: number;
    score: number;
    tokens: number;
  } | null>(null);
  const winChecked = useRef(false); // guard: only check once per session

  const { setActivities, clearActivities, setUserRegion, setUserProfile, setEcoScoreSnapshots } = useActivityStore();
  const checkAndResetCelebration = useActivityStore(s => s.checkAndResetCelebration);
  const initialLoadDone = useRef(false);
  // Holds weeklyTarget + region read directly from the Firestore user doc snapshot.
  // The activities listener may fire before setUserProfile/setUserRegion have updated
  // the Zustand store, so we cannot rely on store state here — the ref is always current.
  const snapshotParams = useRef<{ weeklyTarget: number; userRegion: string }>({
    weeklyTarget: 500,
    userRegion: 'GLOBAL_AVG',
  });

  const maybeWriteSnapshot = (uid: string) => {
    if (snapshotWritten.current) return;
    if (!readyFlags.current.userDoc || !readyFlags.current.activities) return;
    snapshotWritten.current = true;
    const { weeklyTarget, userRegion } = snapshotParams.current;
    writeEcoScoreSnapshot(uid, activitiesForSnapshot.current, weeklyTarget, userRegion).catch(() => {});
    // Also keep leaderboard current on every cold boot
    persistWeeklyEcoScore(activitiesForSnapshot.current, weeklyTarget, userRegion).catch(() => {});
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;
    let unsubscribeActivities: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribeDoc)        { unsubscribeDoc();        unsubscribeDoc = undefined; }
      if (unsubscribeActivities) { unsubscribeActivities(); unsubscribeActivities = undefined; }

      clearActivities();
      initialLoadDone.current = false;
      snapshotWritten.current = false;
      readyFlags.current = { userDoc: false, activities: false };
      activitiesForSnapshot.current = [];

      setAuthResolved(true);
      // Reset nav guard on every auth state change so the new state can route
      hasNavigated.current = false;

      if (currentUser) {
        setUser(currentUser);
        freshLogin.current = true;

        // NOTE: setCelebrated(false) is intentionally NOT called here.
        // It was previously called to prevent the celebration re-firing on
        // sign-in, but it also fired on every cold boot (Firebase always
        // triggers onAuthStateChanged on app restart), causing the banner to
        // re-show every time the user re-opened the app after hitting their
        // weekly goal. New-week resets are handled by checkAndResetCelebration()
        // in (tabs)/_layout.tsx, which checks the stored week key against the
        // current week and only resets when they differ.

        unsubscribeDoc = onSnapshot(
          doc(db, 'users', currentUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setHasFinishedOnboarding(data.hasFinishedOnboarding ?? false);
              setUserRegion(data.region || 'GLOBAL_AVG');

              // Resolve photoURL: prefer Firestore doc value, fall back to
              // Firebase Auth (populated for Google users), then existing
              // Zustand value (prevents a null flash on re-login if the
              // Firestore snapshot arrives before the photoURL field is set).
              const existingPhotoURL = useActivityStore.getState().userProfile?.photoURL ?? null;
              const resolvedPhotoURL =
                data.photoURL ||
                currentUser.photoURL ||
                existingPhotoURL ||
                null;

              setUserProfile({
                displayName: data.displayName || '',
                email: data.email || currentUser.email || '',
                photoURL: resolvedPhotoURL,
                weeklyTarget: data.weeklyTarget || 500,
                tokens:           data.tokens ?? 0,
                totalCarbonSaved: data.totalCarbonSaved ?? 0,
              });
              // Keep ref in sync — activities listener reads this to avoid
              // reading stale Zustand state before setUserProfile has fired.
              snapshotParams.current = {
                weeklyTarget: data.weeklyTarget || 500,
                userRegion:   data.region || 'GLOBAL_AVG',
              };

              // If Firebase Auth has a photoURL but the Firestore doc doesn't
              // (e.g. Google sign-in photoURL not yet persisted), write it back
              // so future sessions load correctly without needing auth.currentUser.
              if (!data.photoURL && currentUser.photoURL) {
                setDoc(doc(db, 'users', currentUser.uid), { photoURL: currentUser.photoURL }, { merge: true }).catch(() => {});
              }

              readyFlags.current.userDoc = true;
              maybeWriteSnapshot(currentUser.uid);

              // ── Weekly win check ────────────────────────────────────────
              // Runs once per session after the user doc loads.
              // Looks for an unseen win doc in weeklyWins for last week.
              if (!winChecked.current) {
                winChecked.current = true;
                (async () => {
                  try {
                    // Compute last week's Sunday key (YYYY-MM-DD)
                    const now = new Date();
                    const lastSunday = new Date(now);
                    lastSunday.setDate(now.getDate() - now.getDay() - 7);
                    lastSunday.setHours(0, 0, 0, 0);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const weekId = `${lastSunday.getFullYear()}-${pad(lastSunday.getMonth() + 1)}-${pad(lastSunday.getDate())}`;
 
                    const winRef = doc(
                      db, 'users', currentUser.uid, 'weeklyWins', weekId
                    );
                    const winSnap = await getDoc(winRef);
 
                    if (winSnap.exists()) {
                      const winData = winSnap.data();
                      // Only show if not already seen
                      if (!winData.seen) {
                        // Mark seen immediately so it never re-fires
                        await updateDoc(winRef, { seen: true });
                        // Small delay so the app finishes routing to tabs first
                        setTimeout(() => {
                          setWeeklyWin({
                            rank:   winData.rank   ?? 1,
                            score:  winData.score  ?? 0,
                            tokens: winData.tokensEarned ?? 0,
                          });
                        }, 1800);
                      }
                    }
                  } catch (e) {
                    // Non-critical — silently ignore
                    console.warn('Weekly win check failed:', e);
                  }
                })();
              }
            }
            setUserDocReady(true);
          },
          (error) => { console.error(error); setUserDocReady(true); }
        );

        const q = query(
          collection(db, 'users', currentUser.uid, 'activities'),
          orderBy('date', 'desc')
        );

        unsubscribeActivities = onSnapshot(
          q,
          { includeMetadataChanges: false },
          (snapshot) => {
            if (!initialLoadDone.current) {
              const firebaseData = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((d: any) => !d.deleted) as any[];
              setActivities(firebaseData);
              initialLoadDone.current = true;
              setActivitiesReady(true);

              // Write using ref values — populated by the user doc listener which
              // may not have updated the Zustand store yet at this point.
              activitiesForSnapshot.current = firebaseData;
              readyFlags.current.activities = true;
              maybeWriteSnapshot(currentUser.uid);
              loadEcoScoreSnapshots(currentUser.uid).then(snaps => {
                setEcoScoreSnapshots(snaps);
              }).catch(() => {});

              // Missed-day nudge — runs once per cold boot after activities load
              AsyncStorage.getItem('notifSettings').then(raw => {
                const ns = raw ? JSON.parse(raw) : {};
                const dates = firebaseData.map((a: any) => String(a.date));
                checkAndScheduleMissedDayNudge(dates, ns.missedDayNudge ?? true).catch(() => {});
              }).catch(() => {});

              return;
            }

            const store = useActivityStore.getState();
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const data = change.doc.data();
                if (data.deleted) return;
                const exists = store.activities.some(a => a.id === change.doc.id);
                if (!exists) store.addActivity({ id: change.doc.id, ...data } as any);
              } else if (change.type === 'modified') {
                const data = change.doc.data();
                if (data.deleted) store.removeActivity(change.doc.id);
                else store.updateActivity(change.doc.id, { id: change.doc.id, ...data });
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
    if (hasNavigated.current) return; // ← guard: only route once per auth state

    const readyToRoute = freshLogin.current
      ? (userDocReady && hasFinishedOnboarding !== null)
      : !loading;

    if (readyToRoute) {
      if (!user) {
        hasNavigated.current = true;
        freshLogin.current = false;
        router.replace('/login');
      } else if (hasFinishedOnboarding === false) {
        hasNavigated.current = true;
        freshLogin.current = false;
        router.replace('/onboarding');
      } else if (hasFinishedOnboarding === true) {
        hasNavigated.current = true;
        freshLogin.current = false;
        router.replace('/(tabs)');
      }
      // null = doc not written yet, wait
    }
  }, [user, hasFinishedOnboarding, loading, authResolved, userDocReady]);

  useEffect(() => {
    preloadSounds().catch(() => {}); // preload all SFX silently on boot
  }, []);

  if (loading) {
    const bg      = scheme === 'dark' ? '#0B0F0C' : '#F9FAFB';
    const shimmer  = scheme === 'dark' ? '#1a1a1a' : '#E5E7EB';
    const shimmer2 = scheme === 'dark' ? '#222'    : '#F3F4F6';
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

      <WeeklyWinModal
          visible={weeklyWin !== null}
          rank={weeklyWin?.rank ?? 1}
          score={weeklyWin?.score ?? 0}
          tokens={weeklyWin?.tokens ?? 0}
          onClose={() => setWeeklyWin(null)}
        />
    </ThemeProvider>
  );
}