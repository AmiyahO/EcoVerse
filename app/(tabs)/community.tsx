// app/(tabs)/community.tsx
import { useAppTheme } from '@/hooks/useAppTheme';
import { db } from '@/src/firebase/config';
import { useActivityStore } from '@/src/store/activityStore';
import {
  CHALLENGES,
  type Challenge,
  getChallengeProgress,
  getCurrentWeekId,
  fetchChallengesForWeek,
} from '@/src/utils/challengeData';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendMissedChallengeNotification } from '@/src/services/notificationService';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Eco-alias ─────────────────────────────────────────────────────────────────
const ADJECTIVES = ['Solar','Green','Eco','Leaf','River','Storm','Cedar','Fern','Moss','Sage','Tidal','Briar','Dune','Gale','Ember'];
const NOUNS      = ['Fox','Hawk','Bear','Wolf','Deer','Owl','Lynx','Elk','Wren','Hare','Finch','Crane','Pike','Moth','Newt'];

function generateAlias(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (Math.imul(31, hash) + uid.charCodeAt(i)) | 0;
  const h = hash >>> 0;
  return `${ADJECTIVES[h % ADJECTIVES.length]}${NOUNS[(h >> 4) % NOUNS.length]} · ${(h % 9000) + 1000}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  weeklyEcoScore: number;
  showOnLeaderboard: boolean;
  isCurrentUser: boolean;
  rank: number;
}

// ── Medals ────────────────────────────────────────────────────────────────────
const MEDAL: Record<number, { color: string; bg: string; icon: string; label: string }> = {
  1: { color: '#B8860B', bg: '#FFF8DC', icon: 'trophy',  label: '1st' },
  2: { color: '#708090', bg: '#F0F4F8', icon: 'medal',   label: '2nd' },
  3: { color: '#8B4513', bg: '#FDF3EC', icon: 'medal',   label: '3rd' },
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#E8F5E9', text: '#2E7D32' },
  medium: { bg: '#FFF3E0', text: '#E65100' },
  hard:   { bg: '#FCE4EC', text: '#C62828' },
  epic:   { bg: '#EDE7F6', text: '#4527A0' },
};

function scoreColor(score: number) {
  if (score >= 75) return '#43A047';
  if (score >= 50) return '#FB8C00';
  return '#E53935';
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Green';
  if (score >= 50) return 'Amber';
  return 'Low';
}

// ── Podium (top 3) ────────────────────────────────────────────────────────────
function Podium({
  entries,
  displayFor,
  colors: c,
}: {
  entries: LeaderboardEntry[];
  displayFor: (e: LeaderboardEntry) => string;
  colors: any;
}) {
  if (entries.length < 1) return null;

  const order = entries.length === 3 ? [entries[1], entries[0], entries[2]] : [entries[0], entries[1], entries[2]].filter(Boolean);
  const heights = [96, 72, 56];   // heights for ranks 1,2,3

  return (
    <View style={[podiumStyles.wrapper, { backgroundColor: c.surface }]}>
      {order.map((entry, idx) => {
        const medal = MEDAL[entry.rank];
        const isCenter = entry.rank === 1;
        const zoneCol = scoreColor(entry.weeklyEcoScore);
        const blockH = heights[entry.rank - 1] || 56;

        return (
          <View key={entry.uid} style={[podiumStyles.column, isCenter && { marginBottom: 0 }]}>
            {/* Avatar */}
            <View style={[
              podiumStyles.avatarRing,
              { borderColor: medal.color, width: isCenter ? 60 : 48, height: isCenter ? 60 : 48, borderRadius: isCenter ? 30 : 24 },
            ]}>
              {entry.photoURL && entry.showOnLeaderboard ? (
                <Image
                  source={{ uri: entry.photoURL }}
                  style={{ width: isCenter ? 54 : 42, height: isCenter ? 54 : 42, borderRadius: isCenter ? 27 : 21 }}
                />
              ) : (
                <View style={[
                  podiumStyles.avatarFallback,
                  { backgroundColor: medal.color + '25', width: isCenter ? 54 : 42, height: isCenter ? 54 : 42, borderRadius: isCenter ? 27 : 21 },
                ]}>
                  <FontAwesome6 name="sprout" size={isCenter ? 22 : 18} color={medal.color} />
                </View>
              )}
            </View>

            {/* Medal icon */}
            <View style={[podiumStyles.medalPill, { backgroundColor: medal.bg }]}>
              <FontAwesome6 name={medal.icon} size={10} color={medal.color} solid />
              <Text style={[podiumStyles.medalLabel, { color: medal.color }]}>{medal.label}</Text>
            </View>

            {/* Name */}
            <Text
              style={[podiumStyles.podiumName, { color: c.text, fontSize: isCenter ? 13 : 11 }]}
              numberOfLines={1}
            >
              {displayFor(entry)}
            </Text>

            {/* Score */}
            <Text style={[podiumStyles.podiumScore, { color: zoneCol, fontSize: isCenter ? 17 : 14 }]}>
              {entry.weeklyEcoScore}
            </Text>

            {/* Block */}
            <LinearGradient
              colors={[medal.color + 'CC', medal.color + '66']}
              style={[podiumStyles.block, { height: blockH, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]}
            >
              <Text style={podiumStyles.blockRankNum}>{entry.rank}</Text>
            </LinearGradient>
          </View>
        );
      })}
    </View>
  );
}

const podiumStyles = StyleSheet.create({
  wrapper:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16, marginTop: 4, borderRadius: 16, padding: 16 },
  column:       { alignItems: 'center', flex: 1, gap: 4 },
  avatarRing:   { borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  medalPill:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  medalLabel:   { fontSize: 10, fontWeight: '700' },
  podiumName:   { fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  podiumScore:  { fontWeight: '800' },
  block:        { width: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  blockRankNum: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' },
});


// ── Challenge Complete Modal ───────────────────────────────────────────────────
interface ChallengeCompleteModalProps {
  challenge: Challenge | null;
  onClose: () => void;
}

function ChallengeCompleteModal({ challenge, onClose }: ChallengeCompleteModalProps) {
  const { colors } = useAppTheme();
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!challenge) return;
    scaleAnim.setValue(0);
    glowAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(glowAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [challenge]);

  if (!challenge) return null;

  const diffColors = DIFFICULTY_COLORS[challenge.difficulty] ?? { bg: '#E8F5E9', text: '#2E7D32' };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <Animated.View style={[modalStyles.card, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
          {/* Faint background icon for depth */}
          <Animated.View style={[modalStyles.bgIcon, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.06] }) }]}>
            <FontAwesome6 name={challenge.icon} size={140} color={challenge.color} solid />
          </Animated.View>

          {/* Difficulty pill */}
          <View style={[modalStyles.badgePill, { backgroundColor: diffColors.bg }]}>
            <Text style={[modalStyles.badgePillText, { color: diffColors.text }]}>
              {challenge.difficulty.toUpperCase()}
            </Text>
          </View>

          {/* Icon circle */}
          <View style={[modalStyles.iconCircle, { backgroundColor: challenge.color + '22', borderColor: challenge.color + '44' }]}>
            <FontAwesome6 name={challenge.icon} size={36} color={challenge.color} solid />
          </View>

          <Text style={[modalStyles.congrats, { color: colors.text }]}>Challenge Complete!</Text>
          <Text style={[modalStyles.title, { color: colors.text }]}>{challenge.title}</Text>
          <Text style={[modalStyles.badge, { color: challenge.color }]}>🏅 {challenge.badgeLabel}</Text>

          {/* Token reward */}
          <View style={[modalStyles.rewardBox, { backgroundColor: '#43A047' + '14' }]}>
            <FontAwesome6 name="leaf" size={14} color="#43A047" solid />
            <Text style={modalStyles.rewardText}>+{challenge.rewardTokens} EcoTokens earned</Text>
          </View>

          <TouchableOpacity
            style={[modalStyles.btn, { backgroundColor: challenge.color }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={modalStyles.btnText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  card:          { width: '82%', borderRadius: 28, padding: 28, alignItems: 'center', gap: 12, overflow: 'hidden' },
  bgIcon:        { position: 'absolute', top: -20, right: -20 },
  badgePill:     { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  iconCircle:    { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginTop: 4 },
  congrats:      { fontSize: 12, fontWeight: '700', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1.2 },
  title:         { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  badge:         { fontSize: 15, fontWeight: '700' },
  rewardBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  rewardText:    { fontSize: 15, fontWeight: '700', color: '#43A047' },
  btn:           { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 20, marginTop: 4 },
  btnText:       { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ── Main component ─────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const { activities, userProfile } = useActivityStore();
  const auth = getAuth();
  const currentUid = auth.currentUser?.uid ?? '';

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'challenges'>('leaderboard');
  const [leaderboard, setLeaderboard]     = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry]             = useState<LeaderboardEntry | null>(null);
  const [loadingLB, setLoadingLB]         = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const [liveChallenges, setLiveChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [joinedIds, setJoinedIds]         = useState<string[]>([]);
  const [progressMap, setProgressMap]     = useState<Record<string, number>>({});
  const [completedIds, setCompletedIds]   = useState<string[]>([]);
  const [joiningId, setJoiningId]         = useState<string | null>(null);
  const [leavingId, setLeavingId]         = useState<string | null>(null);

  // ── Online/offline indicator ──────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsub;
  }, []);

  // ── Challenge completion modal ─────────────────────────────────────────
  const [pendingCompletion, setPendingCompletion] = useState<Challenge | null>(null);
  // Tracks challenge IDs that already showed the modal this session
  // to prevent re-firing on re-renders or app resume.
  const firedCompletions = useRef<Set<string>>(new Set());

  const tabAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    if (!auth.currentUser) {
      setLoadingLB(false);
      return;
    }
    
    try {
      const q = query(collection(db, 'leaderboard'), orderBy('weeklyEcoScore', 'desc'), limit(50));
      const snap = await getDocs(q);

      if (!auth.currentUser) return;

      const rawEntries: LeaderboardEntry[] = snap.docs.map((d, i) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName ?? null,
          photoURL: data.photoURL ?? null,
          weeklyEcoScore: data.weeklyEcoScore ?? 0,
          showOnLeaderboard: data.showOnLeaderboard ?? false,
          isCurrentUser: d.id === currentUid,
          rank: i + 1, // temporary, overwritten below
        };
      });

      // Assign tied ranks: users with the same score get the same rank number.
      // e.g. two users at score 50 both get rank 2, next user gets rank 4.
      const entries: LeaderboardEntry[] = rawEntries.map((entry, i, arr) => {
        if (i === 0) return { ...entry, rank: 1 };
        const prevScore = arr[i - 1].weeklyEcoScore;
        const prevRank  = arr[i - 1].rank;
        return {
          ...entry,
          rank: entry.weeklyEcoScore === prevScore ? prevRank : i + 1,
        };
      });
      setLeaderboard(entries);
      const me = entries.find(e => e.isCurrentUser);
      if (me) {
        setMyEntry(me);
      } else if (currentUid) {
        const myDoc = await getDoc(doc(db, 'leaderboard', currentUid));
        if (myDoc.exists()) {
          const d = myDoc.data();
          setMyEntry({ uid: currentUid, displayName: d.displayName ?? null, photoURL: d.photoURL ?? null, weeklyEcoScore: d.weeklyEcoScore ?? 0, showOnLeaderboard: d.showOnLeaderboard ?? false, isCurrentUser: true, rank: 999 });
        }
      }
    } catch (e) {
      console.warn('Leaderboard fetch error:', e);
    } finally {
      setLoadingLB(false);
      setRefreshing(false);
    }
  }, [currentUid]);

  const fetchChallengeState = useCallback(async () => {
    if (!currentUid) return;
    try {
      const currentWeekId = getCurrentWeekId();
      const progressRef = doc(db, 'users', currentUid, 'challengeProgress', currentWeekId);
      const snap = await getDoc(progressRef);

      if (snap.exists()) {
        const data = snap.data();
        setJoinedIds(data.joinedIds ?? []);
        setProgressMap(data.progress ?? {});
        setCompletedIds(data.completedIds ?? []);
      } else {
        // No document for this week — could mean the week just rolled over.
        // Check if there's a stale document from a previous week and clean it up.
        // We do this by checking all challengeProgress docs and removing joined
        // challenges from any week that isn't the current one.
        // For simplicity we just reset local state — Firestore old docs are
        // left in place (they're harmless and provide a history trail).
        setJoinedIds([]);
        setProgressMap({});
        setCompletedIds([]);

        // Check previous week's doc to see if user had joined-but-incomplete
        // challenges, and fire a notification for any that expired.
        const prevSunday = new Date();
        prevSunday.setDate(prevSunday.getDate() - prevSunday.getDay() - 7);
        prevSunday.setHours(0, 0, 0, 0);
        const prevWeekId = `${prevSunday.getFullYear()}-${String(prevSunday.getMonth() + 1).padStart(2, '0')}-${String(prevSunday.getDate()).padStart(2, '0')}`;
        const prevSnap = await getDoc(doc(db, 'users', currentUid, 'challengeProgress', prevWeekId));
        if (prevSnap.exists()) {
          const prev = prevSnap.data();
          const prevJoined: string[]    = prev.joinedIds   ?? [];
          const prevCompleted: string[] = prev.completedIds ?? [];
          const missedIds = prevJoined.filter(id => !prevCompleted.includes(id));
          if (missedIds.length > 0) {
            // Fire a single "you had unfinished challenges" notification
            await sendMissedChallengeNotification(missedIds.length).catch(() => {});
          }
        }
      }
    } catch (e) { console.warn('Challenge state error:', e); }
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) return;

    fetchLeaderboard();
    fetchChallengeState();
    fetchChallengesForWeek().then(challenges => { setLiveChallenges(challenges); setLoadingChallenges(false); });
  }, [currentUid, fetchLeaderboard, fetchChallengeState]);

  // Refresh leaderboard every time the user navigates to this tab,
  // so score updates from add.tsx are reflected without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (currentUid) fetchLeaderboard();
    }, [currentUid, fetchLeaderboard])
  );

  useEffect(() => {
    if (!joinedIds.length) return;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const weekActivities = activities.filter(a => { const d = new Date(a.date); return d >= weekStart && d < weekEnd; });

    const newProgress: Record<string, number> = { ...progressMap };
    liveChallenges.forEach(ch => {
      if (!joinedIds.includes(ch.id)) return;
      newProgress[ch.id] = getChallengeProgress(ch, weekActivities);
    });
    setProgressMap(newProgress);

    // ── Completion detection ─────────────────────────────────────────────
    // Check every joined challenge that just hit or crossed its target
    // and hasn't been marked complete yet.
    if (!currentUid) return;
    const weekId = getCurrentWeekId();
    const progressRef = doc(db, 'users', currentUid, 'challengeProgress', weekId);

    for (const ch of liveChallenges) {
      if (!joinedIds.includes(ch.id))              continue; // not joined
      if (completedIds.includes(ch.id))            continue; // already done
      if (firedCompletions.current.has(ch.id))     continue; // modal already shown this session
      if ((newProgress[ch.id] ?? 0) < ch.goal.target) continue; // not reached

      // Mark as fired immediately so concurrent effect calls don't double-fire
      firedCompletions.current.add(ch.id);

      // Update local state
      setCompletedIds(prev => [...prev, ch.id]);

      // Persist completion + credit reward tokens to Firestore
      (async () => {
        try {
          await Promise.all([
            updateDoc(progressRef, { completedIds: arrayUnion(ch.id) }),
            updateDoc(doc(db, 'users', currentUid), { tokens: increment(ch.rewardTokens) }),
          ]);
        } catch (e) {
          console.warn('Challenge completion write failed:', e);
        }
      })();

      // Haptic + show modal (only one modal at a time — queue handled by
      // the user dismissing before the next one can appear)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPendingCompletion(ch);
      break; // show one at a time; remaining completions surface on next effect run
    }
  }, [activities, joinedIds, liveChallenges, completedIds, currentUid]);

  const handleJoin = async (challengeId: string) => {
    if (!currentUid || joiningId) return;
    setJoiningId(challengeId);
    try {
      const weekId = getCurrentWeekId();
      const progressRef = doc(db, 'users', currentUid, 'challengeProgress', weekId);

      // Cache challenge metadata alongside the join so the Achievements screen
      // can display badges for challenges that may no longer exist in Firestore
      // (e.g. from previous weeks after the rotation function replaces them).
      const ch = liveChallenges.find(c => c.id === challengeId);
      const titleCache = ch ? {
        [`challengeTitles.${challengeId}`]: {
          title:        ch.title,
          badgeLabel:   ch.badgeLabel,
          icon:         ch.icon,
          color:        ch.color,
          difficulty:   ch.difficulty,
          rewardTokens: ch.rewardTokens,
        },
      } : {};

      await updateDoc(progressRef, { joinedIds: arrayUnion(challengeId), ...titleCache })
        .catch(async () => {
          await setDoc(progressRef, {
            joinedIds: [challengeId],
            progress: {},
            completedIds: [],
            weekId,
            challengeTitles: ch ? { [challengeId]: {
              title: ch.title, badgeLabel: ch.badgeLabel, icon: ch.icon,
              color: ch.color, difficulty: ch.difficulty, rewardTokens: ch.rewardTokens,
            }} : {},
          });
        });
      setJoinedIds(prev => [...prev, challengeId]);
    } catch (e) { console.warn('Join challenge error:', e); }
    finally { setJoiningId(null); }
  };

  const handleLeave = async (challengeId: string) => {
    if (!currentUid || leavingId) return;
    setLeavingId(challengeId);
    try {
      const weekId = getCurrentWeekId();
      const progressRef = doc(db, 'users', currentUid, 'challengeProgress', weekId);
      await updateDoc(progressRef, { joinedIds: arrayRemove(challengeId) }).catch(() => {});
      setJoinedIds(prev => prev.filter(id => id !== challengeId));
      setProgressMap(prev => { const n = { ...prev }; delete n[challengeId]; return n; });
    } catch (e) { console.warn('Leave challenge error:', e); }
    finally { setLeavingId(null); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
    fetchChallengeState();
    fetchChallengesForWeek().then(challenges => { setLiveChallenges(challenges); setLoadingChallenges(false); });
  };

  const switchTab = (tab: 'leaderboard' | 'challenges') => {
    setActiveTab(tab);
    Animated.spring(tabAnim, { toValue: tab === 'leaderboard' ? 0 : 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    Animated.timing(slideAnim, { toValue: tab === 'leaderboard' ? 0 : 1, duration: 220, useNativeDriver: true }).start();
  };

  const indicatorTranslate = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, (SCREEN_W - 40) / 2 - 4] });

  const displayFor = (entry: LeaderboardEntry) => {
    if (entry.isCurrentUser) return userProfile?.displayName ? `${userProfile.displayName} (You)` : 'You';
    if (entry.showOnLeaderboard && entry.displayName) return entry.displayName;
    return generateAlias(entry.uid);
  };

  // ── Render leaderboard row (4th+) ──────────────────────────────────────────
  const renderRow = ({ item }: { item: LeaderboardEntry }) => {
    if (item.rank <= 3) return null;
    const zoneCol = scoreColor(item.weeklyEcoScore);
    const isMe = item.isCurrentUser;
    const nameStr = displayFor(item);

    return (
      <View style={[
        styles.row,
        { backgroundColor: isMe ? colors.tint + '14' : colors.surfaceMuted },
        isMe && { borderWidth: 1.5, borderColor: colors.tint + '50' },
      ]}>
        <Text style={[styles.rankNum, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }]}>
          {item.rank}
        </Text>

        {item.photoURL && item.showOnLeaderboard ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceMuted }]}>
            <FontAwesome6 name="sprout" size={16} color={colors.text + '88'} />
          </View>
        )}

        <Text
          style={[styles.rowName, { color: isMe ? colors.tint : colors.text }, isMe && { fontWeight: '700' }]}
          numberOfLines={1}
        >
          {nameStr}
        </Text>

        <View style={[styles.scoreBadge, { backgroundColor: zoneCol + '18', borderColor: zoneCol + '40' }]}>
          <View style={[styles.scoreDot, { backgroundColor: zoneCol }]} />
          <Text style={[styles.scoreVal, { color: zoneCol }]}>{item.weeklyEcoScore}</Text>
        </View>
      </View>
    );
  };

  // ── Render challenge card ──────────────────────────────────────────────────
  const renderChallenge = (ch: Challenge) => {
    const joined    = joinedIds.includes(ch.id);
    const completed = completedIds.includes(ch.id);
    const current   = progressMap[ch.id] ?? 0;
    const pct       = Math.min(current / ch.goal.target, 1);
    const isJoining = joiningId === ch.id;
    const isLeaving = leavingId === ch.id;

    return (
      <View
        key={ch.id}
        style={[
          styles.challengeCard,
          { backgroundColor: colors.surface },
          completed && { borderWidth: 1.5, borderColor: '#43A047' + '50' },
        ]}
      >
        {/* Coloured left accent */}
        <View style={[styles.challengeAccent, { backgroundColor: ch.color }]} />

        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.challengeHeader}>
            <View style={[styles.challengeIconWrap, { backgroundColor: ch.color + '18' }]}>
              <FontAwesome6 name={ch.icon} size={18} color={ch.color} solid />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.challengeTitleRow}>
                <Text style={[styles.challengeTitle, { color: colors.text }]} numberOfLines={1}>
                  {ch.title}
                </Text>
                <View style={styles.cardBadgeRow}>
                  {ch.difficulty && (
                    <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[ch.difficulty]?.bg ?? '#eee' }]}>
                      <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[ch.difficulty]?.text ?? '#666' }]}>
                        {ch.difficulty.charAt(0).toUpperCase() + ch.difficulty.slice(1)}
                      </Text>
                    </View>
                  )}
                  {completed && (
                    <View style={styles.completedPill}>
                      <FontAwesome6 name="circle-check" size={10} color="#43A047" solid />
                      <Text style={styles.completedPillText}>Done</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.challengeDesc, { color: colors.text }]}>{ch.description}</Text>
            </View>
          </View>

          {/* Progress */}
          {joined && (
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: completed ? '#43A047' : ch.color, width: `${pct * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {formatProgress(ch, current)}
                </Text>
                <Text style={[styles.progressText, { color: colors.text, opacity: 0.5 }]}>
                  {formatGoal(ch)}
                </Text>
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.challengeFooter}>
            {/* Reward */}
            <View style={styles.rewardRow}>
              <View style={[styles.tokenPill, { backgroundColor: '#43A047' + '15' }]}>
                <FontAwesome6 name="leaf" size={10} color="#43A047" solid />
                <Text style={[styles.tokenPillText, { color: '#43A047' }]}>+{ch.rewardTokens}</Text>
              </View>
              <View style={[styles.badgeChip, { backgroundColor: ch.color + '15' }]}>
                <FontAwesome6 name="award" size={9} color={ch.color} solid />
                <Text style={[styles.badgeLabel, { color: ch.color }]}>{ch.badgeLabel}</Text>
              </View>
            </View>

            {/* Action */}
            {!joined && !completed && (
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: ch.color }]}
                onPress={() => handleJoin(ch.id)}
                disabled={!!isJoining}
                activeOpacity={0.85}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.joinBtnText}>Join</Text>
                )}
              </TouchableOpacity>
            )}
            {joined && !completed && (
              <View style={styles.joinedRow}>
                <View style={[styles.statusTag, { borderColor: ch.color + '60' }]}>
                  <FontAwesome6 name="circle-check" size={9} color={ch.color} solid />
                  <Text style={[styles.statusTagText, { color: ch.color }]}>Joined</Text>
                </View>
                <TouchableOpacity
                  style={[styles.leaveBtn, { borderColor: colors.text + '25' }]}
                  onPress={() => handleLeave(ch.id)}
                  disabled={isLeaving}
                  activeOpacity={0.7}
                >
                  {isLeaving ? (
                    <ActivityIndicator size="small" color={colors.text} style={{ transform: [{ scale: 0.7 }] }} />
                  ) : (
                    <Text style={[styles.leaveBtnText, { color: colors.text }]}>Leave</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {completed && (
              <View style={[styles.statusTag, { borderColor: '#43A04760' }]}>
                <FontAwesome6 name="trophy" size={9} color="#43A047" solid />
                <Text style={[styles.statusTagText, { color: '#43A047' }]}>Completed</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ── Sticky "You" bar ─────────────────────────────────────────────────────────
  const renderStickyMe = () => {
    if (!myEntry || activeTab !== 'leaderboard') return null;
    const zoneCol = scoreColor(myEntry.weeklyEcoScore);
    return (
      <View style={[
        styles.stickyMe,
        { backgroundColor: isDark ? colors.surface : '#fff', borderTopColor: colors.tint + '30', borderTopWidth: 1 },
      ]}>
        <View style={[styles.stickyLeft, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
          <Text style={[styles.stickyRank, { color: colors.tint }]}>
            #{myEntry.rank > 50 ? '50+' : myEntry.rank}
          </Text>
        </View>
        <Text style={[styles.stickyName, { color: colors.tint }]} numberOfLines={1}>
          You
        </Text>
        <View style={[styles.scoreBadge, { backgroundColor: zoneCol + '18', borderColor: zoneCol + '40' }]}>
          <View style={[styles.scoreDot, { backgroundColor: zoneCol }]} />
          <Text style={[styles.scoreVal, { color: zoneCol }]}>{myEntry.weeklyEcoScore}</Text>
        </View>
      </View>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
          <Text style={[styles.headerSub, { color: colors.text }]}>
            Week of {getWeekLabel()} · resets Sunday
          </Text>
        </View>
        <View style={[styles.weekBadge, { backgroundColor: isOnline ? colors.tint + '18' : '#EF5350' + '18' }]}>
          <FontAwesome6
            name={isOnline ? 'tower-broadcast' : 'wifi'}
            size={12}
            color={isOnline ? colors.tint : '#EF5350'}
          />
          <Text style={[styles.weekBadgeText, { color: isOnline ? colors.tint : '#EF5350' }]}>
            {isOnline ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Segmented control */}
      <View style={[styles.segmentTrack, { backgroundColor: colors.surfaceMuted }]}>        
        <Animated.View
          style={[
            styles.segmentIndicator,
            {
              backgroundColor: isDark ? colors.surface : '#ffffff',
              transform: [{ translateX: indicatorTranslate }],
              shadowColor: isDark ? '#000' : '#ffffff',
              shadowOpacity: isDark ? 0.08 : 0.28,
              shadowRadius: isDark ? 4 : 10,
              shadowOffset: { width: 0, height: 0 },
              borderWidth: isDark ? 0 : 0.5,
              borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.08)',
              elevation: isDark ? 2 : 2,
            },
          ]}
        />
        {(['leaderboard', 'challenges'] as const).map(tab => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.segmentBtn}
              onPress={() => switchTab(tab)}
              activeOpacity={0.8}
            >
              <FontAwesome6
                name={tab === 'leaderboard' ? 'ranking-star' : 'bolt'}
                size={12}
                color={active ? colors.tint : colors.text}
                solid
              />
              <Text style={[styles.segmentLabel, { color: active ? colors.tint : colors.text }]}>
                {tab === 'leaderboard' ? 'Leaderboard' : 'Challenges'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Leaderboard ──────────────────────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <View style={{ flex: 1 }}>
          {loadingLB ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.tint} size="large" />
            </View>
          ) : (
            <FlatList
              data={leaderboard}
              keyExtractor={item => item.uid}
              renderItem={renderRow}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
              ListHeaderComponent={
                <>
                  {/* Podium — only show when at least one user has a score > 0 */}
                  {leaderboard.length >= 1 && leaderboard.some(e => e.weeklyEcoScore > 0) && (
                    <Podium entries={leaderboard.slice(0, Math.min(3, leaderboard.length))} displayFor={displayFor} colors={colors} />
                  )}
                  {leaderboard.length > 3 && (
                    <Text style={[styles.sectionNote, { color: colors.text }]}>
                      Ranks 4 – {Math.min(leaderboard.length, 50)}
                    </Text>
                  )}
                </>
              }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(76,175,80,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <FontAwesome6 name="earth-americas" size={32} color="#4CAF50" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No data yet</Text>
                  <Text style={[styles.emptySub, { color: colors.text }]}>
                    Log activities to appear on the leaderboard
                  </Text>
                </View>
              }
            />
          )}
          {renderStickyMe()}
        </View>
      )}

      {/* ── Challenges ───────────────────────────────────────────────────────── */}
      {activeTab === 'challenges' && (
        <ScrollView
          contentContainerStyle={styles.challengeList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        >
          {/* Stats summary */}
          <View style={[styles.challengeSummary, { backgroundColor: colors.surface }]}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryNum, { color: colors.tint }]}>
                {joinedIds.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Joined</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.surfaceMuted }]} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryNum, { color: '#43A047' }]}>
                {completedIds.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Completed</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.surfaceMuted }]} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryNum, { color: '#FB8C00' }]}>
                {liveChallenges.length - joinedIds.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Available</Text>
            </View>
          </View>

          <Text style={[styles.sectionNote, { color: colors.text }]}>
            New challenges every Sunday
          </Text>

          {loadingChallenges ? (
            <ActivityIndicator color={colors.tint} size="large" style={{ marginTop: 32 }} />
          ) : liveChallenges.map(renderChallenge)}

          <View style={styles.privacyNote}>
            <FontAwesome6 name="shield-halved" size={11} color={colors.tint} />
            <Text style={[styles.privacyText, { color: colors.text }]}>
              Progress is private. Only completions are visible to others.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Challenge complete modal ── */}
      <ChallengeCompleteModal
        challenge={pendingCompletion}
        onClose={() => setPendingCompletion(null)}
      />
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekLabel(): string {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatProgress(ch: Challenge, value: number): string {
  switch (ch.goal.metric) {
    case 'steps':      return `${Math.round(value).toLocaleString()} steps`;
    case 'co2':        return `${value.toFixed(2)} kg CO₂`;
    case 'tokens':     return `${Math.round(value)} tokens`;
    case 'distance':   return `${value.toFixed(1)} km`;
    case 'kwh':        return `${value.toFixed(1)} kWh`;
    case 'litres':     return `${Math.round(value).toLocaleString()} L`;
    case 'activities': return ch.goal.target <= 7
      ? `${Math.round(value)} / ${ch.goal.target} days`
      : `${Math.round(value)} activities`;
    default:           return String(Math.round(value));
  }
}

function formatGoal(ch: Challenge): string {
  switch (ch.goal.metric) {
    case 'steps':      return `${ch.goal.target.toLocaleString()} steps`;
    case 'co2':        return `${ch.goal.target} kg CO₂`;
    case 'tokens':     return `${ch.goal.target} tokens`;
    case 'distance':   return `${ch.goal.target} km`;
    case 'kwh':        return `${ch.goal.target} kWh`;
    case 'litres':     return `${ch.goal.target.toLocaleString()} L`;
    case 'activities': return ch.goal.target <= 7
      ? `${ch.goal.target} days`
      : `${ch.goal.target} activities`;
    default:           return String(ch.goal.target);
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, marginTop: 2, opacity: 0.55 },
  weekBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  weekBadgeText: { fontSize: 12, fontWeight: '600' },

  // Segment
  segmentTrack:      { flexDirection: 'row', marginHorizontal: 20, borderRadius: 14, padding: 4, marginBottom: 12, position: 'relative' },
  segmentIndicator:  { position: 'absolute', top: 4, left: 4, width: '50%', bottom: 4, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, zIndex: 1 },
  segmentLabel:      { fontSize: 13, fontWeight: '700' },

  // Leaderboard rows (4th+)
  listContent:   { paddingHorizontal: 16, paddingBottom: 20, gap: 6 },
  sectionNote:   { fontSize: 12, textAlign: 'center', marginBottom: 10, marginTop: 4, opacity: 0.5 },
  row:           { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, gap: 10 },
  rankNum:       { width: 26, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  avatar:        { width: 38, height: 38, borderRadius: 19 },
  avatarFallback:{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowName:       { flex: 1, fontSize: 14, fontWeight: '500' },
  scoreBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  scoreDot:      { width: 6, height: 6, borderRadius: 3 },
  scoreVal:      { fontSize: 13, fontWeight: '800' },

  // Sticky me
  stickyMe:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12 },
  stickyLeft:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  stickyRank:    { fontSize: 13, fontWeight: '800' },
  stickyName:    { flex: 1, fontSize: 15, fontWeight: '700' },

  // Challenges
  challengeList:   { paddingHorizontal: 16, paddingBottom: 36, gap: 10, paddingTop: 4 },
  challengeSummary:{ flexDirection: 'row', borderRadius: 16, padding: 16, marginBottom: 4 },
  summaryStat:     { flex: 1, alignItems: 'center', gap: 2 },
  summaryNum:      { fontSize: 22, fontWeight: '800' },
  summaryLabel:    { fontSize: 12, opacity: 0.6 },
  summaryDivider:  { width: 1, marginVertical: 4 },

  challengeCard:   { flexDirection: 'row', borderRadius: 16, overflow: 'hidden' },
  challengeAccent: { width: 4 },

  // Inner content of card
  challengeHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, paddingBottom: 8 },
  challengeIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  challengeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  challengeTitle:    { fontSize: 15, fontWeight: '700' },
  challengeDesc:     { fontSize: 13, opacity: 0.65, lineHeight: 18 },
  completedPill:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: '#43A04720' },
  completedPillText: { fontSize: 10, fontWeight: '700', color: '#43A047' },

  progressSection:   { paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
  progressTrack:     { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:      { height: '100%', borderRadius: 3 },
  progressLabels:    { flexDirection: 'row', justifyContent: 'space-between' },
  progressText:      { fontSize: 11, fontWeight: '600' },

  challengeFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 14 },
  rewardRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tokenPill:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  tokenPillText:    { fontSize: 11, fontWeight: '700' },
  badgeChip:        { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeLabel:       { fontSize: 11, fontWeight: '600' },

  joinBtn:          { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  joinBtnText:      { color: '#fff', fontSize: 13, fontWeight: '800' },
  cardBadgeRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  difficultyBadge:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  difficultyText:   { fontSize: 10, fontWeight: '700' },
  statusTag:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  statusTagText:    { fontSize: 11, fontWeight: '600' },
  joinedRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveBtn:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  leaveBtnText:     { fontSize: 11, fontWeight: '600', opacity: 0.55 },

  privacyNote:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  privacyText:      { fontSize: 12, flex: 1, lineHeight: 16, opacity: 0.6 },

  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyTitle:       { fontSize: 18, fontWeight: '700' },
  emptySub:         { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, opacity: 0.6, lineHeight: 20 },
});