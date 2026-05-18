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
import { playSound } from '@/src/utils/sfx';

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
  const checkAndResetCelebration = useActivityStore(s => s.checkAndResetCelebration);

  const dynamicTarget = userProfile?.weeklyTarget ?? 500;
  const loading       = !userProfile;

  const weeklyTokens = activities
    .filter(a => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  const progress = Math.min(weeklyTokens / dynamicTarget, 1);

  const [showCelebration, setShowCelebration] = useState(false);
  const slideAnim      = useRef(new Animated.Value(-300)).current;
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef    = useRef<any>(null);

  const [streakMilestone, setStreakMilestone] = useState<number | null>(null);

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

  // If tokens drop below target (e.g. activity deleted), reset celebrated flag
  useEffect(() => {
    if (progress < 1 && celebrated && hasHydrated) {
      setCelebrated(false);
    }
  }, [progress]);

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
        // Fire confetti 150ms after banner starts sliding in — decoupled so
        // the banner animation isn't competing with particle spawning
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

  const weeklyActivityCount = activities.filter(a => a.date && isThisWeek(a.date)).length;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          headerShown: false,
          tabBarButton: HapticTab,
          animation: 'fade',
          sceneStyle: { backgroundColor: colors.background },
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

      {/* ── Confetti cannon — only mounted during a celebration ──────────────
          Gated on showCelebration so no artifact renders when idle.
          Fired via ref 150ms after banner starts to decouple from spring anim. */}
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

      {/* ── Global Celebration Banner ── */}
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