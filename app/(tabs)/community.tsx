// app/(tabs)/community.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import { useActivityStore } from '@/src/store/activityStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getAuth } from 'firebase/auth';
import { CHALLENGES, type Challenge, getCurrentWeekId, getChallengeProgress } from '@/src/utils/challengeData';

// ── Eco-alias generation ──────────────────────────────────────────────────────
const ADJECTIVES = ['Solar', 'Green', 'Eco', 'Leaf', 'River', 'Storm', 'Cedar', 'Fern', 'Moss', 'Sage', 'Tidal', 'Briar', 'Dune', 'Gale', 'Ember'];
const NOUNS      = ['Fox', 'Hawk', 'Bear', 'Wolf', 'Deer', 'Owl', 'Lynx', 'Elk', 'Wren', 'Hare', 'Finch', 'Crane', 'Pike', 'Moth', 'Newt'];

function generateAlias(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (Math.imul(31, hash) + uid.charCodeAt(i)) | 0;
  }
  const h = hash >>> 0;
  const adj  = ADJECTIVES[h % ADJECTIVES.length];
  const noun = NOUNS[(h >> 4) % NOUNS.length];
  const num  = (h % 9000) + 1000;
  return `${adj}${noun} · ${num}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  uid:           string;
  displayName:   string | null;
  photoURL:      string | null;
  weeklyEcoScore: number;
  showOnLeaderboard: boolean;
  isCurrentUser: boolean;
  rank:          number;
}

// ── Medal colours ─────────────────────────────────────────────────────────────
const MEDAL: Record<number, { color: string; icon: string }> = {
  1: { color: '#FFD700', icon: 'trophy' },
  2: { color: '#C0C0C0', icon: 'medal' },
  3: { color: '#CD7F32', icon: 'medal' },
};

// ── Score zone colour (mirrors dashboard ring) ────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return '#4CAF50';
  if (score >= 50) return '#FFC107';
  return '#EF5350';
}

export default function CommunityScreen() {
  const { colors } = useAppTheme();
  const { activities, userProfile } = useActivityStore();
  const auth = getAuth();
  const currentUid = auth.currentUser?.uid ?? '';

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'challenges'>('leaderboard');
  const [leaderboard, setLeaderboard]   = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry]           = useState<LeaderboardEntry | null>(null);
  const [loadingLB, setLoadingLB]       = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  // Challenge state
  const [joinedIds, setJoinedIds]       = useState<string[]>([]);
  const [progressMap, setProgressMap]   = useState<Record<string, number>>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [joiningId, setJoiningId]       = useState<string | null>(null);

  const tabAnim = React.useRef(new Animated.Value(0)).current;

  // ── Leaderboard fetch ───────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'leaderboard'),
        orderBy('weeklyEcoScore', 'desc'),
        limit(50),
      );
      const snap = await getDocs(q);
      const entries: LeaderboardEntry[] = [];

      snap.docs.forEach((d, i) => {
        const data = d.data();
        entries.push({
          uid:            d.id,
          displayName:    data.displayName ?? null,
          photoURL:       data.photoURL ?? null,
          weeklyEcoScore: data.weeklyEcoScore ?? 0,
          showOnLeaderboard: data.showOnLeaderboard ?? false,
          isCurrentUser:  d.id === currentUid,
          rank:           i + 1,
        });
      });

      setLeaderboard(entries);

      const me = entries.find(e => e.isCurrentUser);
      if (me) {
        setMyEntry(me);
      } else if (currentUid) {
        // Current user outside top 50 — fetch separately
        const myDoc = await getDoc(doc(db, 'leaderboard', currentUid));
        if (myDoc.exists()) {
          const d = myDoc.data();
          setMyEntry({
            uid:            currentUid,
            displayName:    d.displayName ?? null,
            photoURL:       d.photoURL ?? null,
            weeklyEcoScore: d.weeklyEcoScore ?? 0,
            showOnLeaderboard: d.showOnLeaderboard ?? false,
            isCurrentUser:  true,
            rank:           999, // outside top 50
          });
        }
      }
    } catch (e) {
      console.warn('Leaderboard fetch error:', e);
    } finally {
      setLoadingLB(false);
      setRefreshing(false);
    }
  }, [currentUid]);

  // ── Challenge state from Firestore ──────────────────────────────────────────
  const fetchChallengeState = useCallback(async () => {
    if (!currentUid) return;
    try {
      const weekId = getCurrentWeekId();
      const progressRef = doc(db, 'users', currentUid, 'challengeProgress', weekId);
      const snap = await getDoc(progressRef);
      if (snap.exists()) {
        const data = snap.data();
        setJoinedIds(data.joinedIds ?? []);
        setProgressMap(data.progress ?? {});
        setCompletedIds(data.completedIds ?? []);
      }
    } catch (e) {
      console.warn('Challenge state fetch error:', e);
    }
  }, [currentUid]);

  useEffect(() => {
    fetchLeaderboard();
    fetchChallengeState();
  }, [fetchLeaderboard, fetchChallengeState]);

  // Derive live progress for joined challenges from activities
  useEffect(() => {
    if (!joinedIds.length) return;
    const weekId  = getCurrentWeekId();
    // Sunday-based week — matches getWeekRange() in ecoLogic.ts
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekActivities = activities.filter(a => {
      const d = new Date(a.date);
      return d >= weekStart && d < weekEnd;
    });

    const newProgress: Record<string, number> = { ...progressMap };
    CHALLENGES.forEach(ch => {
      if (!joinedIds.includes(ch.id)) return;
      newProgress[ch.id] = getChallengeProgress(ch, weekActivities);
    });
    setProgressMap(newProgress);
  }, [activities, joinedIds]);

  // ── Join challenge ──────────────────────────────────────────────────────────
  const handleJoin = async (challengeId: string) => {
    if (!currentUid || joiningId) return;
    setJoiningId(challengeId);
    try {
      const weekId = getCurrentWeekId();
      const progressRef = doc(db, 'users', currentUid, 'challengeProgress', weekId);
      await updateDoc(progressRef, {
        joinedIds: arrayUnion(challengeId),
      }).catch(async () => {
        // Document may not exist yet
        const { setDoc } = await import('firebase/firestore');
        await setDoc(progressRef, { joinedIds: [challengeId], progress: {}, completedIds: [] });
      });
      setJoinedIds(prev => [...prev, challengeId]);
    } catch (e) {
      console.warn('Join challenge error:', e);
    } finally {
      setJoiningId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
    fetchChallengeState();
  };

  // ── Tab switch animation ────────────────────────────────────────────────────
  const switchTab = (tab: 'leaderboard' | 'challenges') => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'leaderboard' ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const indicatorTranslate = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160], // half of segment width
  });

  // ── Display name helper ─────────────────────────────────────────────────────
  const displayFor = (entry: LeaderboardEntry) => {
    if (entry.isCurrentUser) {
      return userProfile?.displayName
        ? `${userProfile.displayName} (You)`
        : 'You';
    }
    if (entry.showOnLeaderboard && entry.displayName) return entry.displayName;
    return generateAlias(entry.uid);
  };

  // ── Render leaderboard row ──────────────────────────────────────────────────
  const renderRow = ({ item }: { item: LeaderboardEntry }) => {
    const medal   = MEDAL[item.rank];
    const nameStr = displayFor(item);
    const zoneCol = scoreColor(item.weeklyEcoScore);
    const isMe    = item.isCurrentUser;

    return (
      <View style={[
        styles.row,
        { backgroundColor: isMe ? colors.tint + '18' : colors.surface },
        isMe && { borderWidth: 1, borderColor: colors.tint + '40' },
      ]}>
        {/* Rank */}
        <View style={styles.rankCol}>
          {medal ? (
            <FontAwesome6 name={medal.icon} size={18} color={medal.color} solid />
          ) : (
            <Text style={[styles.rankNum, { color: colors.text }]}>
              {item.rank > 50 ? '50+' : item.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        {item.photoURL && item.showOnLeaderboard ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.tint + '30' }]}>
            <FontAwesome6 name="leaf" size={14} color={colors.tint} solid />
          </View>
        )}

        {/* Name */}
        <Text
          style={[styles.rowName, { color: colors.text }, isMe && { color: colors.tint, fontWeight: '700' }]}
          numberOfLines={1}
        >
          {nameStr}
        </Text>

        {/* Score */}
        <View style={[styles.scorePill, { backgroundColor: zoneCol + '20' }]}>
          <Text style={[styles.scoreVal, { color: zoneCol }]}>{item.weeklyEcoScore}</Text>
        </View>
      </View>
    );
  };

  // ── Render challenge card ───────────────────────────────────────────────────
  const renderChallenge = (ch: Challenge) => {
    const joined    = joinedIds.includes(ch.id);
    const completed = completedIds.includes(ch.id);
    const current   = progressMap[ch.id] ?? 0;
    const pct       = Math.min(current / ch.goal.target, 1);
    const isJoining = joiningId === ch.id;

    return (
      <View key={ch.id} style={[styles.challengeCard, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={styles.challengeHeader}>
          <View style={[styles.challengeIcon, { backgroundColor: ch.color + '20' }]}>
            <FontAwesome6 name={ch.icon} size={20} color={ch.color} solid />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.challengeTitle, { color: colors.text }]}>{ch.title}</Text>
            <Text style={[styles.challengeDesc, { color: colors.text }]}>{ch.description}</Text>
          </View>
          {completed && (
            <View style={[styles.completedBadge, { backgroundColor: '#4CAF50' + '20' }]}>
              <FontAwesome6 name="circle-check" size={14} color="#4CAF50" solid />
            </View>
          )}
        </View>

        {/* Progress bar */}
        {joined && (
          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: completed ? '#4CAF50' : ch.color,
                    width: `${pct * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: colors.text }]}>
              {formatProgress(ch, current)} / {formatGoal(ch)}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.challengeFooter}>
          <View style={styles.rewardRow}>
            <FontAwesome6 name="leaf" size={12} color="#4CAF50" solid />
            <Text style={[styles.rewardText, { color: colors.text }]}>
              +{ch.rewardTokens} tokens
            </Text>
            <View style={[styles.badgeChip, { backgroundColor: ch.color + '15' }]}>
              <FontAwesome6 name="award" size={10} color={ch.color} solid />
              <Text style={[styles.badgeLabel, { color: ch.color }]}>{ch.badgeLabel}</Text>
            </View>
          </View>

          {!joined && !completed && (
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: ch.color }]}
              onPress={() => handleJoin(ch.id)}
              disabled={!!isJoining}
              activeOpacity={0.8}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.joinBtnText}>Join</Text>
              )}
            </TouchableOpacity>
          )}
          {joined && !completed && (
            <View style={[styles.joinedTag, { borderColor: ch.color }]}>
              <FontAwesome6 name="circle-check" size={10} color={ch.color} solid />
              <Text style={[styles.joinedTagText, { color: ch.color }]}>Joined</Text>
            </View>
          )}
          {completed && (
            <View style={[styles.joinedTag, { borderColor: '#4CAF50' }]}>
              <FontAwesome6 name="trophy" size={10} color="#4CAF50" solid />
              <Text style={[styles.joinedTagText, { color: '#4CAF50' }]}>Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Sticky "You" row (leaderboard) ──────────────────────────────────────────
  const renderStickyMe = () => {
    if (!myEntry || activeTab !== 'leaderboard') return null;
    const zoneCol = scoreColor(myEntry.weeklyEcoScore);
    return (
      <View style={[styles.stickyMe, { backgroundColor: colors.surface, borderTopColor: colors.surfaceMuted }]}>
        <View style={styles.rankCol}>
          {MEDAL[myEntry.rank] ? (
            <FontAwesome6 name={MEDAL[myEntry.rank].icon} size={16} color={MEDAL[myEntry.rank].color} solid />
          ) : (
            <Text style={[styles.rankNum, { color: colors.text }]}>
              {myEntry.rank > 50 ? '50+' : myEntry.rank}
            </Text>
          )}
        </View>
        {myEntry.photoURL && myEntry.showOnLeaderboard ? (
          <Image source={{ uri: myEntry.photoURL }} style={styles.avatarSm} />
        ) : (
          <View style={[styles.avatarFallbackSm, { backgroundColor: colors.tint + '30' }]}>
            <FontAwesome6 name="leaf" size={11} color={colors.tint} solid />
          </View>
        )}
        <Text style={[styles.rowName, { color: colors.tint, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
          You
        </Text>
        <View style={[styles.scorePill, { backgroundColor: zoneCol + '20' }]}>
          <Text style={[styles.scoreVal, { color: zoneCol }]}>{myEntry.weeklyEcoScore}</Text>
        </View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
        <Text style={[styles.headerSub, { color: colors.text }]}>
          Week of {getWeekLabel()}
        </Text>
      </View>

      {/* Segmented control */}
      <View style={[styles.segmentTrack, { backgroundColor: colors.surfaceMuted }]}>
        <Animated.View
          style={[
            styles.segmentIndicator,
            { backgroundColor: colors.tint, transform: [{ translateX: indicatorTranslate }] },
          ]}
        />
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => switchTab('leaderboard')}
          activeOpacity={0.8}
        >
          <FontAwesome6
            name="ranking-star"
            size={13}
            color={activeTab === 'leaderboard' ? '#fff' : colors.text}
            solid
          />
          <Text style={[
            styles.segmentLabel,
            { color: activeTab === 'leaderboard' ? '#fff' : colors.text },
          ]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => switchTab('challenges')}
          activeOpacity={0.8}
        >
          <FontAwesome6
            name="bolt"
            size={13}
            color={activeTab === 'challenges' ? '#fff' : colors.text}
            solid
          />
          <Text style={[
            styles.segmentLabel,
            { color: activeTab === 'challenges' ? '#fff' : colors.text },
          ]}>
            Challenges
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Leaderboard ── */}
      {activeTab === 'leaderboard' && (
        <View style={{ flex: 1 }}>
          {loadingLB ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={leaderboard}
              keyExtractor={item => item.uid}
              renderItem={renderRow}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.tint}
                />
              }
              ListHeaderComponent={
                <Text style={[styles.sectionNote, { color: colors.text }]}>
                  Ranked by Weekly EcoScore · resets every Sunday
                </Text>
              }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <FontAwesome6 name="users" size={32} color={colors.text} />
                  <Text style={[styles.emptyText, { color: colors.text }]}>
                    No data yet — log activities to appear here
                  </Text>
                </View>
              }
            />
          )}
          {renderStickyMe()}
        </View>
      )}

      {/* ── Challenges ── */}
      {activeTab === 'challenges' && (
        <ScrollView
          contentContainerStyle={styles.challengeList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
        >
          <Text style={[styles.sectionNote, { color: colors.text }]}>
            Weekly challenges · new set every Sunday
          </Text>
          {CHALLENGES.map(renderChallenge)}
          <View style={styles.privacyNote}>
            <FontAwesome6 name="shield-halved" size={11} color={colors.text} />
            <Text style={[styles.privacyText, { color: colors.text }]}>
              Challenge progress is private. Only completion is visible to others.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekLabel(): string {
  const now    = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatProgress(ch: Challenge, value: number): string {
  switch (ch.goal.metric) {
    case 'steps':    return `${Math.round(value).toLocaleString()} steps`;
    case 'co2':      return `${value.toFixed(2)} kg CO₂`;
    case 'tokens':   return `${Math.round(value)} tokens`;
    case 'distance': return `${value.toFixed(1)} km`;
    case 'kwh':      return `${value.toFixed(1)} kWh`;
    default:         return String(Math.round(value));
  }
}

function formatGoal(ch: Challenge): string {
  switch (ch.goal.metric) {
    case 'steps':    return `${ch.goal.target.toLocaleString()} steps`;
    case 'co2':      return `${ch.goal.target} kg CO₂`;
    case 'tokens':   return `${ch.goal.target} tokens`;
    case 'distance': return `${ch.goal.target} km`;
    case 'kwh':      return `${ch.goal.target} kWh`;
    default:         return String(ch.goal.target);
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle:     { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  headerSub:       { fontSize: 13, marginTop: 2, opacity: 0.7 },

  // Segment
  segmentTrack:    { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 3, marginBottom: 16, position: 'relative', overflow: 'hidden' },
  segmentIndicator:{ position: 'absolute', top: 3, left: 3, width: '50%', bottom: 3, borderRadius: 10 },
  segmentBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, zIndex: 1 },
  segmentLabel:    { fontSize: 13, fontWeight: '600' },

  // Leaderboard
  listContent:     { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  sectionNote:     { fontSize: 12, textAlign: 'center', marginBottom: 12, marginTop: 4 },
  row:             { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
  rankCol:         { width: 28, alignItems: 'center' },
  rankNum:         { fontSize: 14, fontWeight: '700' },
  avatar:          { width: 36, height: 36, borderRadius: 18 },
  avatarFallback:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarSm:        { width: 28, height: 28, borderRadius: 14 },
  avatarFallbackSm:{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowName:         { flex: 1, fontSize: 14, fontWeight: '500' },
  scorePill:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  scoreVal:        { fontSize: 13, fontWeight: '700' },

  // Sticky me
  stickyMe:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },

  // Challenges
  challengeList:   { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  challengeCard:   { borderRadius: 16, padding: 16, gap: 12 },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  challengeIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  challengeTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  challengeDesc:   { fontSize: 13, lineHeight: 18 },
  completedBadge:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  progressSection: { gap: 6 },
  progressTrack:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 3 },
  progressLabel:   { fontSize: 12 },

  challengeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rewardRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardText:      { fontSize: 12, fontWeight: '600' },
  badgeChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeLabel:      { fontSize: 11, fontWeight: '600' },

  joinBtn:         { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  joinBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  joinedTag:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  joinedTagText:   { fontSize: 12, fontWeight: '600' },

  privacyNote:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingTop: 4 },
  privacyText:     { fontSize: 12, flex: 1, lineHeight: 16 },

  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  emptyText:       { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});