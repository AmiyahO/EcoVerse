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
  AppState,
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
import { playSound } from '@/src/utils/sfx';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Eco-alias ─────────────────────────────────────────────────────────────────
const ADJECTIVES = ['Solar','Green','Eco','Leaf','River','Storm','Cedar','Fern','Moss','Sage','Tidal','Briar','Dune','Gale','Ember'];
const NOUNS      = ['Fox','Hawk','Bear','Wolf','Deer','Owl','Lynx','Elk','Wren','Hare','Finch','Crane','Pike','Moth','Newt'];

function generateAlias(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (Math.imul(31, hash) + uid.charCodeAt(i)) | 0;
  const h = hash >>> 0;
  return `${ADJECTIVES[h % ADJECTIVES.length]}${NOUNS[(h >>> 4) % NOUNS.length]} · ${(h % 9000) + 1000}`;
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

interface LifetimeEntry {
  uid:              string;
  displayName:      string | null;
  photoURL:         string | null;
  totalCarbonSaved: number;
  tokens:           number;
  showOnLeaderboard: boolean;
  isCurrentUser:    boolean;
  rank:             number;
}

// ── Medals ────────────────────────────────────────────────────────────────────
const MEDAL: Record<number, { color: string; bg: string; icon: string; label: string }> = {
  1: { color: '#B8860B', bg: '#FFF8DC', icon: 'trophy',  label: '1st' },
  2: { color: '#708090', bg: '#F0F4F8', icon: 'medal',   label: '2nd' },
  3: { color: '#8B4513', bg: '#FDF3EC', icon: 'medal',   label: '3rd' },
};

// Crown colours matching leaderboard medal ranks
const CROWN_COLOR: Record<number, string> = {
  1: '#FFD700',  // gold
  2: '#A8A8A8',  // silver
  3: '#CD7F32',  // bronze
};

function crownColor(rank: number) { return CROWN_COLOR[rank] ?? '#B8860B'; }

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#E8F5E9', text: '#2E7D32' },
  medium: { bg: '#FFF3E0', text: '#E65100' },
  hard:   { bg: '#FCE4EC', text: '#C62828' },
  epic:   { bg: '#EDE7F6', text: '#4527A0' },
};

function AvatarImage({ uri, size, radius, fallbackSize, fallbackColor }: {
  uri: string; size: number; radius: number; fallbackSize: number; fallbackColor: string;
}) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center', backgroundColor: fallbackColor + '25' }}>
        <FontAwesome6 name="seedling" size={fallbackSize} color={fallbackColor} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius }}
      onError={() => setError(true)}
    />
  );
}

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
  lastWeekWinners = {},
}: {
  entries: LeaderboardEntry[];
  displayFor: (e: LeaderboardEntry) => string;
  colors: any;
  lastWeekWinners?: Record<string, number>;
}) {
  if (entries.length < 1) return null;
 
  const rank1 = entries.filter(e => e.rank === 1).slice(0, 2);
  const rank2 = entries.filter(e => e.rank === 2).slice(0, 1);
  const rank3 = entries.filter(e => e.rank === 3).slice(0, 1);
  const order = [...rank2, ...rank1, ...rank3];
 
  const heights: Record<number, number> = { 1: 96, 2: 72, 3: 56 };
 
  return (
    <View style={[podiumStyles.wrapper, { backgroundColor: c.surface }]}>
      {order.map((entry) => {
        const medal      = MEDAL[entry.rank] ?? MEDAL[3];
        const isCenter   = entry.rank === 1;
        const zoneCol    = scoreColor(entry.weeklyEcoScore);
        const blockH     = heights[entry.rank] ?? 56;
        const lastRank   = lastWeekWinners[entry.uid];
 
        return (
          <View key={entry.uid} style={[podiumStyles.column, isCenter && { marginBottom: 0 }]}>
            {/* Crown pill — only shown for last week's winner(s) */}
            {lastRank !== undefined && (
              <View style={[podiumStyles.crownPill, { backgroundColor: medal.color + '22', borderColor: medal.color + '60' }]}>
                <FontAwesome6 name="crown" size={9} color={medal.color} />
                <Text style={[podiumStyles.crownText, { color: medal.color }]}>#{lastRank} last week</Text>
              </View>
            )}
 
            {/* Avatar */}
            <View style={[
              podiumStyles.avatarRing,
              { borderColor: medal.color, width: isCenter ? 60 : 48, height: isCenter ? 60 : 48, borderRadius: isCenter ? 30 : 24 },
            ]}>
              {entry.photoURL && entry.showOnLeaderboard
                ? <AvatarImage uri={entry.photoURL} size={isCenter ? 54 : 42} radius={isCenter ? 27 : 21} fallbackSize={isCenter ? 22 : 18} fallbackColor={medal.color} />
                : <View style={[podiumStyles.avatarFallback, { backgroundColor: medal.color + '25', width: isCenter ? 54 : 42, height: isCenter ? 54 : 42, borderRadius: isCenter ? 27 : 21 }]}>
                    <FontAwesome6 name="seedling" size={isCenter ? 22 : 18} color={medal.color} />
                  </View>
              }
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
  crownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 4,
  },
  crownText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});


// ── Challenge Complete Modal ───────────────────────────────────────────────────
interface ChallengeCompleteModalProps {
  challenge: Challenge | null;
  onClose: () => void;
}

function ChallengeCompleteModal({ challenge, onClose }: ChallengeCompleteModalProps) {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
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
        <Animated.View style={[modalStyles.card, { backgroundColor: isDark ? '#101F10' : '#FFFFFF', transform: [{ scale: scaleAnim }] }]}>
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
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' },
  card:          { width: '82%', borderRadius: 28, padding: 28, alignItems: 'center', gap: 12, overflow: 'hidden',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
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

function LifetimePodium({
  entries,
  displayFor,
  metric,
  colors: c,
}: {
  entries: LifetimeEntry[];
  displayFor: (e: LifetimeEntry) => string;
  metric: 'co2' | 'tokens';
  colors: any;
}) {
  if (entries.length < 1) return null;
 
  // Cap rank1 ties at 2 — more than that makes the podium overflow
  const rank1 = entries.filter(e => e.rank === 1).slice(0, 2);
  const rank2 = entries.filter(e => e.rank === 2).slice(0, 1);
  const rank3 = entries.filter(e => e.rank === 3).slice(0, 1);
  const order = [...rank2, ...rank1, ...rank3];
  const heights: Record<number, number> = { 1: 96, 2: 72, 3: 56 };
 
  return (
    <View style={[podiumStyles.wrapper, { backgroundColor: c.surface }]}>
      {order.map(entry => {
        const medal   = MEDAL[entry.rank] ?? MEDAL[3];
        const isCenter = entry.rank === 1;
        const blockH  = heights[entry.rank] ?? 56;
        const value   = metric === 'co2'
          ? `${entry.totalCarbonSaved.toFixed(1)} kg`
          : `${entry.tokens.toLocaleString()}`;
 
        return (
          <View key={entry.uid} style={[podiumStyles.column, isCenter && { marginBottom: 0 }]}>
            <View style={[
              podiumStyles.avatarRing,
              { borderColor: medal.color, width: isCenter ? 60 : 48, height: isCenter ? 60 : 48, borderRadius: isCenter ? 30 : 24 },
            ]}>
              {entry.photoURL && entry.showOnLeaderboard
                ? <AvatarImage uri={entry.photoURL} size={isCenter ? 54 : 42} radius={isCenter ? 27 : 21} fallbackSize={isCenter ? 22 : 18} fallbackColor={medal.color} />
                : <View style={[podiumStyles.avatarFallback, { backgroundColor: medal.color + '25', width: isCenter ? 54 : 42, height: isCenter ? 54 : 42, borderRadius: isCenter ? 27 : 21 }]}>
                    <FontAwesome6 name="seedling" size={isCenter ? 22 : 18} color={medal.color} />
                  </View>
              }
            </View>
            <View style={[podiumStyles.medalPill, { backgroundColor: medal.bg }]}>
              <FontAwesome6 name={medal.icon} size={10} color={medal.color} solid />
              <Text style={[podiumStyles.medalLabel, { color: medal.color }]}>{medal.label}</Text>
            </View>
            <Text style={[podiumStyles.podiumName, { color: c.text, fontSize: isCenter ? 13 : 11 }]} numberOfLines={1}>
              {displayFor(entry)}
            </Text>
            <Text style={[podiumStyles.podiumScore, { color: medal.color, fontSize: isCenter ? 15 : 12 }]}>
              {value}
            </Text>
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const { activities, userProfile } = useActivityStore();
  const auth = getAuth();
  const [currentUid, setCurrentUid] = useState<string>(getAuth().currentUser?.uid ?? '');

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'challenges' | 'lifetime'>('leaderboard');
  const [leaderboard, setLeaderboard]         = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry]                 = useState<LeaderboardEntry | null>(null);
  const [loadingLB, setLoadingLB]             = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [lifetimeBoard, setLifetimeBoard]     = useState<LifetimeEntry[]>([]);
  const [lifetimeMetric, setLifetimeMetric]   = useState<'co2' | 'tokens'>('co2');
  const [loadingLifetime, setLoadingLifetime] = useState(false);
  const [myLifetimeEntry, setMyLifetimeEntry] = useState<LifetimeEntry | null>(null);
  const [lastWeekWinners, setLastWeekWinners] = useState<Record<string, number>>({}); // uid -> rank
  const missedNotifFiredRef = useRef(false); // guard: fire at most once per session

  const [liveChallenges, setLiveChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [joinedIds, setJoinedIds]         = useState<string[]>([]);
  const [progressMap, setProgressMap]     = useState<Record<string, number>>({});
  const [completedIds, setCompletedIds]   = useState<string[]>([]);
  const [joiningId, setJoiningId]         = useState<string | null>(null);
  const [leavingId, setLeavingId]         = useState<string | null>(null);

  useEffect(() => {
    const unsub = getAuth().onAuthStateChanged(u => {
      setCurrentUid(u?.uid ?? '');
    });
    return unsub;
  }, []);
  
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
        const optedIn = data.showOnLeaderboard === true;
        return {
          uid: d.id,
          // Only expose real name/photo if user has explicitly opted in
          displayName: optedIn ? (data.displayName ?? null) : null,
          photoURL:    optedIn ? (data.photoURL ?? null)    : null,
          weeklyEcoScore: data.weeklyEcoScore ?? 0,
          showOnLeaderboard: optedIn,
          isCurrentUser: d.id === currentUid,
          rank: i + 1, // temporary, overwritten below
        };
      });

      // Assign tied ranks: users with the same score get the same rank number.
      // e.g. two users at score 50 both get rank 2, next user gets rank 4.
      // Uses a for-loop so each step reads the already-computed rank from
      // the previous entry (not the temp sequential rank in rawEntries).
      const entries: LeaderboardEntry[] = [];
      for (let i = 0; i < rawEntries.length; i++) {
        const score = rawEntries[i].weeklyEcoScore;
        if (i === 0) {
          // Score 0 users get positional rank but are not "ranked" for podium purposes
          entries.push({ ...rawEntries[i], rank: score > 0 ? 1 : i + 1 });
        } else {
          const prevScore = rawEntries[i - 1].weeklyEcoScore;
          const prevRank  = entries[i - 1].rank;
          if (score <= 0) {
            // All zero-score users just get sequential ranks — no ties at 0
            entries.push({ ...rawEntries[i], rank: i + 1 });
          } else {
            entries.push({
              ...rawEntries[i],
              rank: score === prevScore ? prevRank : i + 1,
            });
          }
        }
      }
      setLeaderboard(entries);
      const me = entries.find(e => e.isCurrentUser);
      if (me) {
        setMyEntry(me);
      } else if (currentUid) {
        const myDoc = await getDoc(doc(db, 'leaderboard', currentUid));
        if (myDoc.exists()) {
          const d = myDoc.data();
          const optedIn = d.showOnLeaderboard === true;
          // User not in top 50 — compute their rank from their score vs leaderboard
          const myScore = d.weeklyEcoScore ?? 0;
          const usersAbove = entries.filter(e => e.weeklyEcoScore > myScore).length;
          const computedRank = usersAbove + 1;
          setMyEntry({ uid: currentUid, displayName: optedIn ? (d.displayName ?? null) : null, photoURL: optedIn ? (d.photoURL ?? null) : null, weeklyEcoScore: myScore, showOnLeaderboard: optedIn, isCurrentUser: true, rank: computedRank });
        }
      }
    } catch (e) {
      console.warn('Leaderboard fetch error:', e);
    } finally {
      setLoadingLB(false);
      setRefreshing(false);
      lastFetchRef.current = Date.now();
    }
  }, [currentUid]);

  const fetchLifetimeLeaderboard = useCallback(async () => {
    if (!auth.currentUser) return;
    setLoadingLifetime(true);
    try {
      const metric = lifetimeMetric === 'co2' ? 'totalCarbonSaved' : 'tokens';
      const q = query(
        collection(db, 'leaderboard'),
        orderBy(metric, 'desc'),
        limit(50),
      );
      const snap = await getDocs(q);
      if (!auth.currentUser) return;
 
      const raw: LifetimeEntry[] = snap.docs.map(d => {
        const data    = d.data();
        const optedIn = data.showOnLeaderboard === true;
        return {
          uid:              d.id,
          displayName:      optedIn ? (data.displayName ?? null) : null,
          photoURL:         optedIn ? (data.photoURL ?? null)    : null,
          totalCarbonSaved: data.totalCarbonSaved ?? 0,
          tokens:           data.tokens           ?? 0,
          showOnLeaderboard: optedIn,
          isCurrentUser:    d.id === currentUid,
          rank:             0, // assigned below
        };
      });
 
      // Assign tied ranks using the same pattern as the weekly leaderboard
      const sorted: LifetimeEntry[] = [];
      for (let i = 0; i < raw.length; i++) {
        const value = lifetimeMetric === 'co2' ? raw[i].totalCarbonSaved : raw[i].tokens;
        if (i === 0) {
          sorted.push({ ...raw[i], rank: 1 });
        } else {
          const prevValue = lifetimeMetric === 'co2'
            ? raw[i - 1].totalCarbonSaved
            : raw[i - 1].tokens;
          sorted.push({
            ...raw[i],
            rank: value === prevValue ? sorted[i - 1].rank : i + 1,
          });
        }
      }
 
      setLifetimeBoard(sorted);
      const me = sorted.find(e => e.isCurrentUser);
      if (me) {
        setMyLifetimeEntry(me);
      } else if (currentUid) {
        const myDoc = await getDoc(doc(db, 'leaderboard', currentUid));
        if (myDoc.exists()) {
          const d       = myDoc.data();
          const optedIn = d.showOnLeaderboard === true;
          const myValue = lifetimeMetric === 'co2'
            ? (d.totalCarbonSaved ?? 0)
            : (d.tokens ?? 0);
          const usersAbove = sorted.filter(e =>
            (lifetimeMetric === 'co2' ? e.totalCarbonSaved : e.tokens) > myValue
          ).length;
          setMyLifetimeEntry({
            uid:              currentUid,
            displayName:      optedIn ? (d.displayName ?? null) : null,
            photoURL:         optedIn ? (d.photoURL ?? null)    : null,
            totalCarbonSaved: d.totalCarbonSaved ?? 0,
            tokens:           d.tokens           ?? 0,
            showOnLeaderboard: optedIn,
            isCurrentUser:    true,
            rank:             usersAbove + 1,
          });
        }
      }
    } catch (e) {
      console.warn('Lifetime leaderboard fetch error:', e);
    } finally {
      setLoadingLifetime(false);
    }
  }, [currentUid, lifetimeMetric]);

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
          if (missedIds.length > 0 && !missedNotifFiredRef.current) {
            // Fire at most once per app session — guard prevents re-firing on
            // every pull-to-refresh or tab navigation while the week has no doc.
            missedNotifFiredRef.current = true;
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
    // Prefetch lifetime in background so it's ready when the user taps the tab.
    // fetchLifetimeLeaderboard sets loadingLifetime=true only for a moment —
    // by the time the user navigates there it'll already be resolved.
    fetchLifetimeLeaderboard();
  }, [currentUid, fetchLeaderboard, fetchChallengeState, fetchLifetimeLeaderboard]);

  // Fetch last week's winner UIDs+ranks from the shared meta doc written by the
  // Cloud Function at reset time. Single read, no per-user queries needed.
  useEffect(() => {
    if (!currentUid) return;
    getDoc(doc(db, 'meta', 'lastWeekWinners'))
      .then(snap => {
        if (snap.exists()) {
          const winners: Array<{ uid: string; rank: number }> = snap.data().winners ?? [];
          const map: Record<string, number> = {};
          winners.forEach(w => { map[w.uid] = w.rank; });
          setLastWeekWinners(map);
        }
      })
      .catch(() => {}); // non-critical
  }, [currentUid]);

  // Refresh leaderboard every time the user navigates to this tab,
  // so score updates from add.tsx are reflected without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (currentUid) fetchLeaderboard();
    }, [currentUid, fetchLeaderboard])
  );

  // Refetch leaderboard when app returns to foreground, but only if it's been
  // more than 5 minutes since the last fetch. This covers the case where the
  // app is left open across Sunday midnight — the weekly reset will have run
  // server-side but useFocusEffect won't fire if Community tab was already active.
  const lastFetchRef = useRef<number>(0);
  const REFETCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
 
  useEffect(() => {
    if (!currentUid) return;
 
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        const now = Date.now();
        if (now - lastFetchRef.current > REFETCH_THRESHOLD_MS) {
          lastFetchRef.current = now;
          fetchLeaderboard();
          if (activeTab === 'lifetime') fetchLifetimeLeaderboard();
        }
      }
    });
 
    return () => subscription.remove();
  }, [currentUid, activeTab, fetchLeaderboard, fetchLifetimeLeaderboard]);

  useEffect(() => {
    if (activeTab === 'lifetime' && currentUid) {
      fetchLifetimeLeaderboard();
    }
  }, [activeTab, lifetimeMetric, currentUid]);

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
      playSound('goal-reached').catch(() => {});
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
    fetchChallengesForWeek().then(challenges => {
      setLiveChallenges(challenges);
      setLoadingChallenges(false);
    });
    if (activeTab === 'lifetime') fetchLifetimeLeaderboard();
  };

  const TAB_LIST = ['leaderboard', 'challenges', 'lifetime'] as const;
  const TAB_W = (SCREEN_W - 40 - 8) / 3; // track width ÷ 3 tabs
 
  const switchTab = (tab: typeof TAB_LIST[number]) => {
    setActiveTab(tab);
    const idx = TAB_LIST.indexOf(tab);
    Animated.spring(tabAnim, {
      toValue: idx,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };
 
  const indicatorTranslate = tabAnim.interpolate({
    inputRange:  [0, 1, 2],
    outputRange: [0, TAB_W, TAB_W * 2],
  });

  const displayFor = (entry: LeaderboardEntry) => {
    if (entry.isCurrentUser) return userProfile?.displayName ? `${userProfile.displayName} (You)` : 'You';
    if (entry.showOnLeaderboard && entry.displayName) return entry.displayName;
    return generateAlias(entry.uid);
  };

  const displayLifetimeFor = (entry: LifetimeEntry) => {
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
    const lastRank = lastWeekWinners[item.uid];

    return (
      <View style={[
        styles.row,
        { backgroundColor: isMe ? colors.tint + '14' : colors.surfaceMuted },
        isMe && { borderWidth: 1.5, borderColor: colors.tint + '50' },
      ]}>
        <Text style={[styles.rankNum, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }]}>
          {item.rank}
        </Text>

        {item.photoURL && item.showOnLeaderboard
          ? <AvatarImage uri={item.photoURL} size={38} radius={19} fallbackSize={16} fallbackColor={colors.text + '88'} />
          : <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceMuted }]}>
              <FontAwesome6 name="seedling" size={16} color={colors.text + '88'} />
            </View>
        }

        <Text
          style={[styles.rowName, { color: isMe ? colors.tint : colors.text }, isMe && { fontWeight: '700' }]}
          numberOfLines={1}
        >
          {nameStr}
        </Text>

        {lastRank !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <FontAwesome6 name="crown" size={11} color={crownColor(lastRank)} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: crownColor(lastRank) }}>#{lastRank}</Text>
          </View>
        )}

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
    const lastRank = lastWeekWinners[myEntry.uid];
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
        <Text style={[styles.stickyName, { color: colors.tint }]} numberOfLines={1}>You</Text>
        {lastRank !== undefined && (
          <View style={[podiumStyles.crownPill, { backgroundColor: crownColor(lastRank) + '22', borderColor: crownColor(lastRank) + '60' }]}>
            <FontAwesome6 name="crown" size={9} color={crownColor(lastRank)} />
            <Text style={[podiumStyles.crownText, { color: crownColor(lastRank) }]}>#{lastRank} last week</Text>
          </View>
        )}
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

      {/* ── Segmented control (3 tabs) ── */}
      <View style={[styles.segmentTrack, { backgroundColor: colors.surfaceMuted }]}>
        <Animated.View
          style={[
            styles.segmentIndicator,
            {
              width: TAB_W,
              backgroundColor: isDark ? colors.surface : '#ffffff',
              transform: [{ translateX: indicatorTranslate }],
              shadowColor: isDark ? '#000' : '#ffffff',
              shadowOpacity: isDark ? 0.08 : 0.28,
              shadowRadius: isDark ? 4 : 10,
              shadowOffset: { width: 0, height: 0 },
              borderWidth: isDark ? 0 : 0.5,
              borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.08)',
              elevation: 2,
            },
          ]}
        />
        {TAB_LIST.map(tab => {
          const active = activeTab === tab;
          const icon   = tab === 'leaderboard' ? 'ranking-star'
                       : tab === 'challenges'  ? 'bolt'
                       : 'earth-americas';
          const label  = tab === 'leaderboard' ? 'Weekly'
                       : tab === 'challenges'  ? 'Challenges'
                       : 'Lifetime';
          return (
            <TouchableOpacity
              key={tab}
              style={styles.segmentBtn}
              onPress={() => switchTab(tab)}
              activeOpacity={0.8}
            >
              <FontAwesome6 name={icon} size={12} color={active ? colors.tint : colors.text} solid />
              <Text style={[styles.segmentLabel, { color: active ? colors.tint : colors.text }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Weekly Leaderboard ──────────────────────────────────────────────────────── */}
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
                  {/* Podium — always show when there are leaderboard entries */}
                  {leaderboard.length >= 1 && (
                    <Podium
                      entries={leaderboard.filter(e => e.rank <= 3)}
                      displayFor={displayFor}
                      colors={colors}
                      lastWeekWinners={lastWeekWinners}
                    />
                  )}
                  {/* "Week just started" note — shown below podium when nobody has scored yet */}
                  {leaderboard.length >= 1 && !leaderboard.some(e => e.weeklyEcoScore > 0) && (
                    <View style={[styles.noScoreBanner, { backgroundColor: colors.tint + '12', borderColor: colors.tint + '30' }]}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.tint + '20', alignItems: 'center', justifyContent: 'center' }}>
                        <FontAwesome6 name="seedling" size={18} color={colors.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.noScoreTitle, { color: colors.text }]}>Week just started!</Text>
                        <Text style={[styles.noScoreSub, { color: colors.text }]}>No EcoScores yet — log activities to claim the top spot.</Text>
                      </View>
                    </View>
                  )}
                  {leaderboard.some(e => e.rank > 3) && (
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
              Challenge progress and completions are private — only you can see them.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Lifetime Leaderboard ── */}
      {activeTab === 'lifetime' && (
        <View style={{ flex: 1 }}>
          {loadingLifetime ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.tint} size="large" />
            </View>
          ) : (
            <FlatList
              data={lifetimeBoard}
              keyExtractor={item => item.uid}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
              }
              ListHeaderComponent={
                <>
                  {/* ── Inline header toggle ── */}
                  <View style={styles.lifetimeHeader}>
                    <View style={[styles.lifetimeToggle, { backgroundColor: colors.surfaceMuted }]}>
                      <TouchableOpacity
                        style={[
                          styles.lifetimeToggleBtn,
                          lifetimeMetric === 'co2' && {
                            backgroundColor: isDark ? colors.surface : '#ffffff',
                            borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.08)',
                            borderWidth: isDark ? 0 : 0.5,
                            // Matches the elevation/shadow of the main segment indicator
                            elevation: 2,
                          },
                        ]}
                        onPress={() => setLifetimeMetric('co2')}
                        activeOpacity={0.8}
                      >
                        <FontAwesome6
                          name="cloud"
                          size={10}
                          color={lifetimeMetric === 'co2' ? colors.tint : colors.text + '88'}
                        />
                        <Text style={[
                          styles.lifetimeToggleText,
                          { color: lifetimeMetric === 'co2' ? colors.tint : colors.text + '88' },
                        ]}>
                          CO₂
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.lifetimeToggleBtn,
                          lifetimeMetric === 'tokens' && {
                            backgroundColor: isDark ? colors.surface : '#ffffff',
                            borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.08)',
                            borderWidth: isDark ? 0 : 0.5,
                            elevation: 2,
                          },
                        ]}
                        onPress={() => setLifetimeMetric('tokens')}
                        activeOpacity={0.8}
                      >
                        <FontAwesome6
                          name="leaf"
                          size={10}
                          color={lifetimeMetric === 'tokens' ? colors.tint : colors.text + '88'}
                        />
                        <Text style={[
                          styles.lifetimeToggleText,
                          { color: lifetimeMetric === 'tokens' ? colors.tint : colors.text + '88' },
                        ]}>
                          Tokens
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
 
                  {/* Podium */}
                  {lifetimeBoard.length >= 1 && (
                    <LifetimePodium
                      entries={lifetimeBoard.filter(e => e.rank <= 3)}
                      displayFor={displayLifetimeFor}
                      metric={lifetimeMetric}
                      colors={colors}
                    />
                  )}
                  {lifetimeBoard.some(e => e.rank > 3) && (
                    <Text style={[styles.sectionNote, { color: colors.text }]}>
                      Ranks 4 – {Math.min(lifetimeBoard.length, 50)}
                    </Text>
                  )}
                </>
              }
              renderItem={({ item }) => {
                if (item.rank <= 3) return null;
                const value   = lifetimeMetric === 'co2'
                  ? `${item.totalCarbonSaved.toFixed(1)} kg`
                  : `${item.tokens.toLocaleString()} tokens`;
                const isMe    = item.isCurrentUser;
                const nameStr = displayLifetimeFor(item);
                return (
                  <View style={[
                    styles.row,
                    { backgroundColor: isMe ? colors.tint + '14' : colors.surfaceMuted },
                    isMe && { borderWidth: 1.5, borderColor: colors.tint + '50' },
                  ]}>
                    <Text style={[styles.rankNum, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }]}>
                      {item.rank}
                    </Text>
                    {item.photoURL && item.showOnLeaderboard
                      ? <AvatarImage uri={item.photoURL} size={38} radius={19} fallbackSize={16} fallbackColor={colors.text + '88'} />
                      : <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceMuted }]}>
                          <FontAwesome6 name="seedling" size={16} color={colors.text + '88'} />
                        </View>
                    }
                    <Text
                      style={[styles.rowName, { color: isMe ? colors.tint : colors.text }, isMe && { fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {nameStr}
                    </Text>
                    <View style={[styles.scoreBadge, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' }]}>
                      <FontAwesome6
                        name={lifetimeMetric === 'co2' ? 'cloud' : 'leaf'}
                        size={10}
                        color={colors.tint}
                      />
                      <Text style={[styles.scoreVal, { color: colors.tint }]}>{value}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <FontAwesome6 name="earth-americas" size={32} color="#4CAF50" style={{ marginBottom: 12, opacity: 0.5 }} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No lifetime data yet</Text>
                  <Text style={[styles.emptySub, { color: colors.text }]}>
                    Log activities to appear on the lifetime board
                  </Text>
                </View>
              }
            />
          )}
 
          {/* Sticky "You" bar */}
          {myLifetimeEntry && (() => {
            const value = lifetimeMetric === 'co2'
              ? `${myLifetimeEntry.totalCarbonSaved.toFixed(1)} kg CO₂`
              : `${myLifetimeEntry.tokens.toLocaleString()} tokens`;
            return (
              <View style={[
                styles.stickyMe,
                { backgroundColor: isDark ? colors.surface : '#fff', borderTopColor: colors.tint + '30', borderTopWidth: 1 },
              ]}>
                <View style={[styles.stickyLeft, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
                  <Text style={[styles.stickyRank, { color: colors.tint }]}>
                    #{myLifetimeEntry.rank > 50 ? '50+' : myLifetimeEntry.rank}
                  </Text>
                </View>
                <Text style={[styles.stickyName, { color: colors.tint }]} numberOfLines={1}>You</Text>
                <View style={[styles.scoreBadge, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' }]}>
                  <FontAwesome6
                    name={lifetimeMetric === 'co2' ? 'cloud' : 'leaf'}
                    size={10}
                    color={colors.tint}
                  />
                  <Text style={[styles.scoreVal, { color: colors.tint }]}>{value}</Text>
                </View>
              </View>
            );
          })()}
        </View>
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
  segmentIndicator:  { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, zIndex: 1 },
  segmentLabel:      { fontSize: 13, fontWeight: '700' },

  // Leaderboard rows (4th+)
  listContent:   { paddingHorizontal: 16, paddingBottom: 20, gap: 6 },
  sectionNote:   { fontSize: 12, textAlign: 'center', marginBottom: 10, marginTop: 4, opacity: 0.5 },
  noScoreBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  noScoreTitle:  { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  noScoreSub:    { fontSize: 12, opacity: 0.6, lineHeight: 17 },
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

  // Lifetime tab
  lifetimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    marginBottom: 12,
    marginTop: 2,
  },
  lifetimeToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 2,
    gap: 2,
  },
  lifetimeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  lifetimeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});