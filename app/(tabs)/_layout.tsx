// layout.tsx for the bottom tab navigator
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

  const dynamicTarget  = userProfile?.weeklyTarget ?? 500;
  const loading        = !userProfile;

  const weeklyTokens = activities
    .filter(a => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  const progress = Math.min(weeklyTokens / dynamicTarget, 1);

  const [showCelebration, setShowCelebration] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissCelebration = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowCelebration(false));
  };

  useEffect(() => {
      if (progress >= 1 && !loading && !celebrated && hasHydrated) {
      setCelebrated(true);
      setShowCelebration(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 12,
      }).start();
      dismissTimeout.current = setTimeout(() => dismissCelebration(), 6000);
    }
  }, [progress, loading, hasHydrated, celebrated]);

  useEffect(() => {
    return () => {
      if (dismissTimeout.current) clearTimeout(dismissTimeout.current);
    };
  }, []);

  const weeklyActivityCount = activities.filter(a => a.date && isThisWeek(a.date)).length;

  const checkAndResetCelebration = useActivityStore(s => s.checkAndResetCelebration);

  useEffect(() => {
    checkAndResetCelebration();
  }, []);

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

      {/* ── Global Celebration Banner ── */}
      {showCelebration && (
        <>
          <ConfettiCannon
            count={120}
            origin={{ x: 200, y: 0 }}
            fadeOut={true}
            explosionSpeed={350}
            fallSpeed={2500}
          />
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
                <ThemedText style={styles.bannerTitle}>Weekly Goal Crushed! 🎉</ThemedText>
                <ThemedText style={styles.bannerSub}>
                  {weeklyTokens} tokens · {weeklyActivityCount} activities this week
                </ThemedText>
              </View>
              <Pressable onPress={dismissCelebration} hitSlop={12}>
                <FA6 name="xmark" size={16} color="#ffffffaa" />
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </>
      )}
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