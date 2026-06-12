// (tabs)/profile.tsx
import { View, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateStreak, calculateTokens } from '@/src/utils/ecoLogic';
import { getLevelInfo, getRankInfo } from '@/src/utils/levelSystem';
import { router } from 'expo-router';
import { FontAwesome6, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useRef } from 'react';
import { auth } from '@/src/firebase/config';
import StreakCalendarSheet from '@/components/streak-calendar-sheet';

function isThisWeek(date: string) {
  const d = new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function calculateLongestStreak(activities: any[]): number {
  if (!activities.length) return 0;
  const days = new Set(
    activities.map(a => {
      const d = new Date(a.date);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })
  );
  const sorted = [...days].sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i-1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; longest = Math.max(longest, current); }
    else current = 1;
  }
  return longest;
}

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
  const longestStreak = calculateLongestStreak(activities);

  const userProfile = useActivityStore(s => s.userProfile);
  const profile = userProfile;
  const loading = !userProfile;

  const setCelebrated = useActivityStore(s => s.setCelebrated);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const dynamicTarget = Math.max(profile?.weeklyTarget || 500, 1); // never 0
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

  const totalTokens = userProfile?.tokens ?? 0;
  const totalCO2 = userProfile?.totalCarbonSaved ?? 0;
  const totalActivities = activities.length;

  // ── Level & rank derived from total tokens ──
  const { level, progress: xpProgress, tokensToNext } = getLevelInfo(totalTokens);
  const rank = getRankInfo(level);

  const memberSince = auth.currentUser?.metadata?.creationTime
    ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

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
    ? [colors.tint + 'CC', '#00897B', '#004D40']
    : [colors.tint, '#00897B', '#006064'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StreakCalendarSheet
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        activities={activities}
        streak={streak}
        longestStreak={longestStreak}
      />
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Hero Card ── */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

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

          <View style={styles.profileInfoRow}>
            {profile?.photoURL ? (
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: highResPhoto || profile.photoURL }}
                  style={styles.avatar}
                  onError={() => {/* falls through to placeholder on broken URI */}}
                />
              </View>
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <ThemedText style={styles.avatarInitial}>
                  {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                </ThemedText>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <ThemedText style={styles.displayName}>{profile?.displayName || 'Eco Explorer'}</ThemedText>
              <ThemedText style={styles.emailText}>{profile?.email}</ThemedText>
            </View>
            <Pressable onPress={() => router.push('/edit-profile')} style={styles.editButton}>
              <FontAwesome6 name="pen" size={12} color="#fff" />
            </Pressable>
          </View>

          {/* ── Token / Activities / CO₂ summary ── */}
          <View style={styles.statsSummary}>
            <View style={styles.miniStat}>
              <ThemedText style={styles.miniStatVal}>{totalTokens.toLocaleString()}</ThemedText>
              <ThemedText style={styles.miniStatLabel}>Tokens</ThemedText>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.miniStat}>
              <ThemedText style={styles.miniStatVal}>{totalActivities}</ThemedText>
              <ThemedText style={styles.miniStatLabel}>Activities</ThemedText>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.miniStat}>
              <ThemedText style={styles.miniStatVal}>{totalCO2.toFixed(2)}</ThemedText>
              <ThemedText style={styles.miniStatLabel}>kg CO₂ saved</ThemedText>
            </View>
          </View>

          {/* ── Level badge + XP progress bar ── */}
          <View style={styles.levelSection}>
            {/* Rank pill — tappable, routes to leveling screen */}
            <Pressable
              onPress={() => router.push('/leveling')}
              style={({ pressed }) => [
                styles.rankPill,
                { borderColor: rank.color, backgroundColor: rank.color + '33' },
                pressed && { opacity: 0.75 },
              ]}
            >
              <MaterialCommunityIcons name={rank.icon as any} size={14} color={rank.color} />
              <Text style={[styles.rankPillText, { color: rank.color }]}>
                {rank.name}  ·  Lv {level}
              </Text>
              <FontAwesome6 name="chevron-right" size={10} color={rank.color} style={{ marginLeft: 6, opacity: 0.7 }} />
            </Pressable>

            {/* XP progress track */}
            <View style={[styles.xpTrack, { shadowColor: rank.color, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]}>
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${Math.round(xpProgress * 100)}%`,
                    backgroundColor: rank.color,
                    shadowColor: rank.color,
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
            </View>

            <Text style={styles.xpLabel}>
              {tokensToNext.toLocaleString()} tokens to Lv {level + 1}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Consistency Card ── */}
        <Pressable
          onPress={() => setCalendarVisible(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardTitleRow}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 15 }}>
                Consistency
              </ThemedText>
              <View style={styles.cardTitleRight}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.streakBadge}>
                    <FontAwesome6
                      name="fire"
                      size={12}
                      color={streak > 0 ? '#FF7043' : colors.text}
                      style={{ opacity: streak > 0 ? 1 : 0.3 }}
                    />
                    <ThemedText style={[
                      styles.streakBadgeText,
                      { color: streak > 0 ? '#FF7043' : colors.text, opacity: streak > 0 ? 1 : 0.4 }
                    ]}>
                      {streak > 0 ? `${streak}d` : '0d'}
                    </ThemedText>
                  </View>
                  {longestStreak > 0 && (() => {
                    const beaten = streak >= longestStreak;
                    const pillColor = beaten ? '#dca729' : colors.tint;
                    return (
                      <View style={[styles.streakBadge, {
                        backgroundColor: pillColor + '20',
                        borderWidth: 1, borderColor: pillColor + '50',
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                      }]}>
                        <FontAwesome6 name="trophy" size={10} color={pillColor} />
                        <ThemedText style={[styles.streakBadgeText, { color: pillColor, fontSize: 11, fontWeight: '700' }]}>
                          {beaten ? `PB ${longestStreak}d` : `Best ${longestStreak}d`}
                        </ThemedText>
                      </View>
                    );
                  })()}
                </View>
                <FontAwesome6 name="chevron-right" size={11} color={colors.text + '33'} />
              </View>
            </View>

            <View style={styles.dotsRow}>
              {WEEK_DAYS.map((day, idx) => (
                <View key={idx} style={styles.dotItem}>
                  <View style={[
                    styles.dot,
                    weeklyDots[idx]
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.tint + '30' }
                  ]}>
                    {weeklyDots[idx] && <FontAwesome6 name="check" size={8} color="#fff" />}
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
        </Pressable>

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

          <View style={styles.goalTokenRow}>
            <ThemedText style={[styles.goalTokenCurrent, { color: colors.tint }]}>
              {weeklyTokens}
            </ThemedText>
            <ThemedText style={[styles.goalTokenSep, { color: colors.text }]}>
              {' '}/ {dynamicTarget} tokens
            </ThemedText>
          </View>

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
            Goal reached this week! <MaterialIcons name="celebration" size={14} color={colors.tint} /> 
            </ThemedText>
          ) : (
            <ThemedText style={[styles.goalRemainingLabel, { color: colors.text }]}>
              {dynamicTarget - weeklyTokens} tokens to go
            </ThemedText>
          )}
        </View>

        {/* ── Achievements Card ── */}
        <Pressable
          style={({ pressed }) => [styles.visionCard, {
            backgroundColor: colors.surface,
            borderColor: '#FFD16630',
            opacity: pressed ? 0.8 : 1,
          }]}
          onPress={() => router.push('/achievements')}
        >
          <View style={[styles.visionIcon, { backgroundColor: '#FFD16618' }]}>
            <FontAwesome6 name="trophy" size={18} color="#FFD166" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.visionTitle, { color: colors.text }]}>
              Achievements
            </ThemedText>
            <ThemedText style={[styles.visionSub, { color: colors.text }]}>
              Badges, milestones – challenge trophies
            </ThemedText>
          </View>
          <FontAwesome6 name="chevron-right" size={13} color={colors.text} style={{ opacity: 0.3 }} />
        </Pressable>

        {/* ── What's Next card ── */}
        <Pressable
          style={({ pressed }) => [styles.visionCard, {
            backgroundColor: colors.surface,
            borderColor: colors.tint + '30',
            opacity: pressed ? 0.8 : 1,
          }]}
          onPress={() => router.push('/future-vision')}
        >
          <View style={[styles.visionIcon, { backgroundColor: colors.tint + '18' }]}>
            <FontAwesome6 name="rocket" size={18} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.visionTitle, { color: colors.text }]}>
              What&#39;s Next for EcoVerse
            </ThemedText>
            <ThemedText style={[styles.visionSub, { color: colors.text }]}>
              Token rewards, friend challenges, city partnerships
            </ThemedText>
          </View>
          <FontAwesome6 name="chevron-right" size={13} color={colors.text} style={{ opacity: 0.3 }} />
        </Pressable>

      </ScrollView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 24 },

  heroCard: { borderRadius: 20, padding: 20, gap: 16 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroScreenLabel: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroMemberSince: { fontSize: 12, color: '#ffffffaa', marginTop: 2 },
  settingsBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },

  profileInfoRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: {},
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#fff', overflow: 'hidden' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  avatarInitial: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  displayName: { fontSize: 19, fontWeight: '700', color: '#fff' },
  emailText: { fontSize: 13, color: '#ffffffcc', marginTop: 2 },
  editButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },

  statsSummary: {
    flexDirection: 'row',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'space-evenly',
  },
  miniStat: { alignItems: 'center', flex: 1 },
  miniStatVal: { color: '#fff', fontSize: 17, fontWeight: '800' },
  miniStatLabel: { color: '#ffffffcc', fontSize: 11, textAlign: 'center', marginTop: 2 },
  statsDivider: { width: 1, height: '80%', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },

  // ── Level section ──
  levelSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 10,
    alignItems: 'center',
  },
  rankPill: {
    borderWidth: 1.5,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rankPillText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  xpTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  card: { padding: 16, borderRadius: 16, gap: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  streakBadgeText: { fontSize: 13, fontWeight: '600' },

  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dotItem: { alignItems: 'center', gap: 6 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dotLabel: { fontSize: 11, opacity: 0.5, fontWeight: '500' },
  activeDaysLabel: { fontSize: 12, opacity: 0.5, textAlign: 'center' },

  goalTokenRow: { flexDirection: 'row', alignItems: 'baseline' },
  goalTokenCurrent: { fontSize: 32, fontWeight: '800' },
  goalTokenSep: { fontSize: 15, opacity: 0.5 },
  progressBarBg: { height: 14, borderRadius: 7, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 7 },
  goalCompleteLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  goalRemainingLabel: { fontSize: 12, opacity: 0.5 },

  visionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  visionIcon:  { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  visionTitle: { fontSize: 14, fontWeight: '700' },
  visionSub:   { fontSize: 12, opacity: 0.45, marginTop: 2 },

  decorCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -40, right: -40,
  },
  decorCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -20, left: 20,
  },
});