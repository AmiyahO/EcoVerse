// (tabs)/profile.tsx
import { Animated, View, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateStreak, calculateTokens, calculateCarbonSaved } from '@/src/utils/ecoLogic';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useRef } from 'react';
import { auth } from '@/src/firebase/config';

function isThisWeek(date: string) {
  const d = new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getWeeklyActivityDots(activities: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const dots = Array(7).fill(false);
  activities.forEach(a => {
    if (!a.date) return;
    const d = new Date(a.date);
    const activityDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (activityDate >= startOfWeek && activityDate <= today) {
      dots[activityDate.getDay()] = true;
    }
  });
  return dots;
}

export default function ProfileScreen() {
  const { colors, scheme } = useAppTheme();
  const userRegion = useActivityStore(s => s.userRegion);
  const activities = useActivityStore(s => s.activities);
  const streak = calculateStreak(activities);
  const hasHydrated = useActivityStore(s => s._hasHydrated);

  const userProfile = useActivityStore(s => s.userProfile);
  const profile = userProfile;
  const loading = !userProfile;

  const celebrated = useActivityStore(s => s.celebrated);
  const setCelebrated = useActivityStore(s => s.setCelebrated);

  const dynamicTarget = profile?.weeklyTarget || 500;
  const prevTarget = useRef<number | null>(null);
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGoogleImage = profile?.photoURL?.includes('googleusercontent.com');
  const highResPhoto = isGoogleImage
    ? profile?.photoURL?.replace('=s96-c', '=s400-c')
    : profile?.photoURL;

  const weeklyTokens = activities
    .filter(a => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  const progress = Math.min(weeklyTokens / dynamicTarget, 1);
  const weeklyDots = getWeeklyActivityDots(activities);
  const activeDaysThisWeek = weeklyDots.filter(Boolean).length;

  const totalTokens = activities.reduce((sum, a) => sum + calculateTokens(a), 0);
  const totalCO2 = activities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);

  // Member since
  const memberSince = auth.currentUser?.metadata?.creationTime
    ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  // Target change reset
  useEffect(() => {
    if (prevTarget.current === null) {
      prevTarget.current = dynamicTarget;
      return;
    }
    if (prevTarget.current !== dynamicTarget) {
      const oldTarget = prevTarget.current;
      prevTarget.current = dynamicTarget;
      if (dynamicTarget > oldTarget && progress < 1) {
        resetTimeout.current = setTimeout(() => setCelebrated(false), 300);
      }
    }
  }, [dynamicTarget]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  const gradientColors: [string, string, string] = scheme === 'dark'
    ? ['#1B5E20', '#00897B', '#004D40']
    : ['#2E7D32', '#00897B', '#006064'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── Hero Card ── */}
        <LinearGradient
          colors={scheme === 'dark'
            ? ['#1B5E20', '#00897B', '#004D40']
            : ['#2E7D32', '#00897B', '#006064']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.heroCard}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Top row: title + settings */}
          <View style={styles.heroTopRow}>
            <View>
              <ThemedText style={styles.heroScreenLabel}>Profile</ThemedText>
              {memberSince && (
                <ThemedText style={styles.heroMemberSince}>Member since {memberSince}</ThemedText>
              )}
            </View>
            <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <FontAwesome6 name="gear" size={16} color="#ffffffcc" />
            </Pressable>
          </View>

          {/* Avatar + name + edit */}
          <View style={styles.profileInfoRow}>
            {profile?.photoURL ? (
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: highResPhoto || profile.photoURL }} style={styles.avatar} />
              </View>
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <ThemedText style={styles.avatarInitial}>
                  {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                </ThemedText>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <ThemedText style={styles.displayName}>
                {profile?.displayName || 'Eco Explorer'}
              </ThemedText>
              <ThemedText style={styles.emailText}>{profile?.email}</ThemedText>
            </View>
            <Pressable onPress={() => router.push('/edit-profile')} style={styles.editButton}>
              <FontAwesome6 name="pen" size={12} color="#fff" />
            </Pressable>
          </View>

          {/* Stats row */}
          <View style={styles.statsSummary}>
            <View style={styles.miniStat}>
              <ThemedText style={styles.miniStatVal}>{totalTokens.toLocaleString()}</ThemedText>
              <ThemedText style={styles.miniStatLabel}>Tokens</ThemedText>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.miniStat}>
              <ThemedText style={styles.miniStatVal}>{totalCO2.toFixed(2)}</ThemedText>
              <ThemedText style={styles.miniStatLabel}>kg CO₂ saved</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* ── Consistency Card ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardTitleRow}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 15 }}>
              Consistency
            </ThemedText>
            <View style={styles.streakBadge}>
              <FontAwesome6
                name="leaf"
                size={12}
                color={streak > 0 ? colors.tint : colors.text}
                style={{ opacity: streak > 0 ? 1 : 0.3 }}
              />
              <ThemedText style={[
                styles.streakBadgeText,
                { color: streak > 0 ? colors.tint : colors.text, opacity: streak > 0 ? 1 : 0.4 }
              ]}>
                {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
              </ThemedText>
            </View>
          </View>

          {/* Week dots */}
          <View style={styles.dotsRow}>
            {WEEK_DAYS.map((day, idx) => (
              <View key={idx} style={styles.dotItem}>
                <View style={[
                  styles.dot,
                  weeklyDots[idx]
                    ? { backgroundColor: colors.tint }
                    : { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.tint + '30' }
                ]}>
                  {weeklyDots[idx] && (
                    <FontAwesome6 name="check" size={8} color="#fff" />
                  )}
                </View>
                <ThemedText style={[styles.dotLabel, { color: colors.text }]}>{day}</ThemedText>
              </View>
            ))}
          </View>

          <ThemedText style={[styles.activeDaysLabel, { color: colors.text }]}>
            {activeDaysThisWeek === 0
              ? 'No activity logged this week yet'
              : `${activeDaysThisWeek} of 7 days active this week`}
          </ThemedText>
        </View>

        {/* ── Weekly Goal Card ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardTitleRow}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 15 }}>
              Weekly Goal
            </ThemedText>
            <ThemedText style={{ color: colors.tint, fontWeight: '700', fontSize: 15 }}>
              {Math.round(progress * 100)}%
            </ThemedText>
          </View>

          {/* Token count */}
          <View style={styles.goalTokenRow}>
            <ThemedText style={[styles.goalTokenCurrent, { color: colors.tint }]}>
              {weeklyTokens}
            </ThemedText>
            <ThemedText style={[styles.goalTokenSep, { color: colors.text }]}>
              {' '}/ {dynamicTarget} tokens
            </ThemedText>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceMuted }]}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>

          {progress >= 1 ? (
            <ThemedText style={[styles.goalCompleteLabel, { color: colors.tint }]}>
              🎉 Goal reached this week!
            </ThemedText>
          ) : (
            <ThemedText style={[styles.goalRemainingLabel, { color: colors.text }]}>
              {dynamicTarget - weeklyTokens} tokens to go
            </ThemedText>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },

  // Hero card
  heroCard: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroScreenLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  heroMemberSince: {
    fontSize: 12,
    color: '#ffffffaa',
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },

  // Avatar
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {},
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
  },
  emailText: {
    fontSize: 13,
    color: '#ffffffcc',
    marginTop: 2,
  },
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },

  // Stats row
  statsSummary: {
    flexDirection: 'row',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'space-evenly',
  },
  miniStat: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatVal: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  miniStatLabel: {
    color: '#ffffffcc',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Cards
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Streak badge
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dotItem: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: {
    fontSize: 11,
    opacity: 0.5,
    fontWeight: '500',
  },
  activeDaysLabel: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
  },

  // Weekly goal
  goalTokenRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  goalTokenCurrent: {
    fontSize: 32,
    fontWeight: '800',
  },
  goalTokenSep: {
    fontSize: 15,
    opacity: 0.5,
  },
  progressBarBg: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 7,
  },
  goalCompleteLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  goalRemainingLabel: {
    fontSize: 12,
    opacity: 0.5,
  },

  // Celebration banner
  celebrationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    padding: 16,
    paddingTop: 60,
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
  decorCircle1: {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: 'rgba(255,255,255,0.05)',
  top: -40,
  right: -40,
},
decorCircle2: {
  position: 'absolute',
  width: 120,
  height: 120,
  borderRadius: 60,
  backgroundColor: 'rgba(255,255,255,0.04)',
  bottom: -20,
  left: 20,
},
});