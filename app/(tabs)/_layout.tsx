// app/(tabs)/_layout.tsx
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/haptic-tab';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateTokens } from '@/src/utils/ecoLogic';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { FontAwesome6 as FA6 } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LevelUpModal } from '@/components/LevelUpModal';
import { StreakMilestoneModal } from '@/components/StreakMilestoneModal';
import { AchievementModal } from '@/components/AchievementModal';
import type { AchievementInfo } from '@/components/AchievementModal';
import { playSound } from '@/src/utils/sfx';
import { ACHIEVEMENT_MAP } from '@/src/utils/achievementMap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function isThisWeek(date: string) {
  const d = new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

export default function TabLayout() {
  const { scheme, colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const activities     = useActivityStore(s => s.activities);
  const userProfile    = useActivityStore(s => s.userProfile);
  const celebrated     = useActivityStore(s => s.celebrated);
  const setCelebrated  = useActivityStore(s => s.setCelebrated);
  const hasHydrated    = useActivityStore(s => s._hasHydrated);
  const levelUpPending = useActivityStore((s) => s.levelUpPending);
  const pendingLevel   = useActivityStore((s) => s.pendingLevel);
  const clearLevelUp   = useActivityStore((s) => s.clearLevelUp);
  const totalTokens    = useActivityStore((s) => s.userProfile?.tokens ?? 0);
  const streakMilestonePending = useActivityStore((s) => s.streakMilestonePending);
  const pendingStreakDays      = useActivityStore((s) => s.pendingStreakDays);
  const clearStreakMilestone   = useActivityStore((s) => s.clearStreakMilestone);
  const achievementPending     = useActivityStore((s) => s.achievementPending);
  const pendingAchievementId   = useActivityStore((s) => s.pendingAchievementId);
  const clearAchievement       = useActivityStore((s) => s.clearAchievement);
  const [pendingAchievement, setPendingAchievement] = useState<AchievementInfo | null>(null);
  const checkAndResetCelebration = useActivityStore(s => s.checkAndResetCelebration);

  const dynamicTarget = userProfile?.weeklyTarget ?? 500;
  const loading       = !userProfile;

  // Use Firestore token total for weekly progress — this includes challenge
  // completion bonuses which are written directly to users/{uid}.tokens and
  // are not reflected in per-activity tokensEarned fields.
  // weeklyEcoScore on the user doc is written by persistWeeklyEcoScore() after
  // every activity change, but it's a 0-100 score, not a raw token count.
  // The safest source for the celebration check is the activity-derived tokens
  // PLUS any challenge bonus. Since we can't easily separate them, we use
  // userProfile.tokens as a proxy: if Firestore says the user has enough tokens
  // this week, they earned the celebration regardless of activity recalculation.
  const weeklyTokensFromActivities = activities
    .filter(a => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  // Firestore weeklyEcoScore is an opaque 0-100 score; use it only for display.
  // For the celebration guard, use activities-derived tokens but do NOT reset
  // celebrated when progress dips below 1 — that drop is usually caused by
  // challenge bonus tokens not being reflected in the activity sum, not a real
  // under-goal state. New-week reset is handled by checkAndResetCelebration().
  const progress = Math.min(weeklyTokensFromActivities / dynamicTarget, 1);

  const [showCelebration, setShowCelebration] = useState(false);
  const slideAnim      = useRef(new Animated.Value(-300)).current;
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef    = useRef<any>(null);

  const dismissCelebration = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowCelebration(false));
  };

  // Reset celebrated flag if we're in a new week
  useEffect(() => {
    if (hasHydrated) checkAndResetCelebration();
  }, [hasHydrated]);

  // REMOVED: do not reset celebrated when progress < 1.
  // The activity-derived token sum omits challenge completion bonuses, so
  // progress can appear < 1 even after a genuine goal completion. The only
  // correct place to reset `celebrated` is on a new week (above).

  useEffect(() => {
    if (progress >= 1 && !loading && !celebrated && hasHydrated) {
      setCelebrated(true);
      setTimeout(() => {
        setShowCelebration(true);
        playSound('goal-reached', 1500).catch(() => {});
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }).start();
        setTimeout(() => confettiRef.current?.start(), 150);
        dismissTimeout.current = setTimeout(() => dismissCelebration(), 4000);
      }, 400);
    }
  }, [progress, loading, hasHydrated, celebrated]);

  useEffect(() => {
    return () => {
      if (dismissTimeout.current) clearTimeout(dismissTimeout.current);
    };
  }, []);

  // Resolve pending achievement id → full AchievementInfo for the modal
  useEffect(() => {
    if (achievementPending && pendingAchievementId) {
      const info = ACHIEVEMENT_MAP[pendingAchievementId] ?? null;
      if (info) {
        setPendingAchievement(info);
      } else {
        // ID not in map — auto-clear so achievementPending doesn't stay true forever
        clearAchievement();
        setPendingAchievement(null);
      }
    }
  }, [achievementPending, pendingAchievementId]);

  const weeklyActivityCount = activities.filter(a => a.date && isThisWeek(a.date)).length;
  const weeklyTokens = weeklyTokensFromActivities;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          headerShown: false,
          tabBarButton: HapticTab,
          animation: 'fade',
          sceneStyle: { backgroundColor: colors.background },
          tabBarStyle: {
            paddingBottom: insets.bottom,
            height: 60 + insets.bottom,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <FontAwesome6 name="leaf" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Log',
            tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color, size }) => <FontAwesome6 name="users" size={size} color={color} solid />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>

      {showCelebration && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            ref={confettiRef}
            count={60}
            origin={{ x: 200, y: 0 }}
            autoStart={false}
            fadeOut
            explosionSpeed={250}
            fallSpeed={3000}
            colors={['#66BB6A', '#F9A825', '#42A5F5', '#EF5350', '#26C6DA', '#ffffff']}
          />
        </View>
      )}

      {showCelebration && (
        <Animated.View
          style={[styles.celebrationBanner, { transform: [{ translateY: slideAnim }] }]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={['#2E7D32', '#34C9C9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.celebrationBannerInner}
          >
            <FA6 name="earth-americas" size={28} color="#fff" />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.bannerTitle}>Weekly Goal Crushed!</ThemedText>
              <ThemedText style={styles.bannerSub}>
                {weeklyTokens} tokens · {weeklyActivityCount} activities this week
              </ThemedText>
            </View>
            <Pressable onPress={dismissCelebration} hitSlop={12}>
              <FA6 name="xmark" size={16} color="#ffffffaa" />
            </Pressable>
          </LinearGradient>
        </Animated.View>
      )}

      <LevelUpModal
        visible={levelUpPending}
        newLevel={pendingLevel}
        totalTokens={totalTokens}
        onClose={clearLevelUp}
      />

      <StreakMilestoneModal
        visible={streakMilestonePending}
        streakDays={pendingStreakDays}
        onClose={clearStreakMilestone}
      />

      <AchievementModal
        visible={achievementPending && pendingAchievement !== null}
        achievement={pendingAchievement}
        onClose={() => { clearAchievement(); setPendingAchievement(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  celebrationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    padding: 16,
    paddingTop: 60,
    pointerEvents: 'box-none',
  },
  celebrationBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  bannerSub: {
    color: '#ffffffcc',
    fontSize: 12,
    marginTop: 2,
  },
});