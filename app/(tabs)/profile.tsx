// (tabs)/profile.tsx
import { View, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateStreak , calculateTokens } from '@/src/utils/ecoLogic';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/src/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Modal } from 'react-native';

// Helper function to check if a date is within the current week
function isThisWeek(date: string) {
  const d = new Date(date);
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return d >= startOfWeek;
}

const WEEK_DAYS = ['Sun', 'Mon','Tue','Wed','Thu','Fri','Sat'];

//
function getWeeklyActivityDots(activities: any[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0,0,0,0);

  // Array for 7 days starting from Sunday
  const dots = Array(7).fill(false);

  activities.forEach(a => {
    const d = new Date(a.date);

    // Use local date strings to avoid timezone shifts
    if(d >= startOfWeek) {
      const dayIndex = d.getDay(); // 0=Sun, 1=Mon, ...
      dots[dayIndex] = true;
    }
  });

  return dots;
}

export default function ProfileScreen() {
  const { colors, scheme } = useAppTheme();
  const activities = useActivityStore((state) => state.activities);
  const streak = calculateStreak(activities);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Real-time Firestore State
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasCelebrated = useRef(false);

  const dynamicTarget = profile?.weeklyTarget || 500;

  // 1. Calculate tokens BEFORE the effects so 'progress' is available
  const weeklyTokens = activities
    .filter((a) => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  const progress = Math.min(weeklyTokens / dynamicTarget, 1);
  const weeklyDots = getWeeklyActivityDots(activities);

  // 2. Main Firestore Effect
  useEffect(() => {
    let snapUnsubscribe: (() => void) | undefined;
  
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (snapUnsubscribe) {
        snapUnsubscribe();
        snapUnsubscribe = undefined;
      }
      
      if (user) {
        const docRef = doc(db, "users", user.uid);
        snapUnsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (snapUnsubscribe) snapUnsubscribe();
    };
  }, []);

  // 3. Celebration Effect (MUST be above the 'if (loading)' return)
  useEffect(() => {
    if (progress >= 1 && !loading && !hasCelebrated.current) {
      setShowCelebration(true);
      hasCelebrated.current = true;
    }
  }, [progress, loading]); // Added dependencies

  // 4. Loading return comes AFTER all hooks are declared
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={{ color: colors.text }}>Profile</ThemedText>
          <Pressable onPress={() => router.push('/settings')}>
            <FontAwesome6 name="gear" size={20} color="#6b6b6b" />
          </Pressable>
        </View>

        <ThemedText style={[styles.subtle, { color: colors.text, paddingHorizontal: 18 }]}>
          Your sustainability journey
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* User Card */}
        <LinearGradient
          colors={scheme === 'dark' ? ['#34C9C9', '#2E7D32'] : ['#2E7D32', '#34C9C9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.profileInfoRow}>
            {/* Avatar - Shows Google Photo or First Initial */}
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]}>
                <ThemedText style={{ fontSize: 24, color: colors.text }}>
                  {loading ? '' : (profile?.displayName?.charAt(0).toUpperCase() || 'U')}
                </ThemedText>
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 15 }}>
              <ThemedText type="defaultSemiBold" style={{ color: '#fff', fontSize: 20 }}>
                {profile?.displayName || 'Eco Explorer'}
              </ThemedText>
              <ThemedText style={{ color: '#ffffffcc', fontSize: 14 }}>
                {profile?.email}
              </ThemedText>
            </View>

            {/* Edit Button */}
            <Pressable 
              onPress={() => router.push('/edit-profile')}
              style={styles.editButton}
            >
              <FontAwesome6 name="pen" size={12} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.statsSummary}>
             <View style={styles.miniStat}>
                <ThemedText style={styles.miniStatVal}>{profile?.tokens || 0}</ThemedText>
                <ThemedText style={styles.miniStatLabel}>Tokens</ThemedText>
             </View>
             <View style={styles.divider} />
             <View style={styles.miniStat}>
                <ThemedText style={styles.miniStatVal}>{profile?.totalCarbonSaved?.toFixed(2) || 0}</ThemedText>
                <ThemedText style={styles.miniStatLabel}>kg CO₂</ThemedText>
             </View>
          </View>
        </LinearGradient>

        {/* Consistency Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Consistency</ThemedText>
          <ThemedText style={[styles.subtle, { color: colors.text }]}>
             {streak > 0 ? `🌱 ${streak}-day streak active` : 'Log an activity to start your streak'}
          </ThemedText>
          <View style={styles.streakRow}>
            {WEEK_DAYS.map((day, idx) => (
              <View key={day} style={styles.streakItem}>
                <ThemedText style={{ color: colors.text, fontSize: 10 }}>{day}</ThemedText>
                <View style={[styles.dot, { backgroundColor: weeklyDots[idx] ? colors.tint : colors.surfaceMuted }]} />
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Goal */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
         <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Weekly Goal Progress</ThemedText>
            <ThemedText style={{ color: colors.tint, fontWeight: 'bold' }}>{Math.round(progress * 100)}%</ThemedText>
          </View>

          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.tint }]} />
          </View>

          <ThemedText style={[styles.subtle, { color: colors.text }]}>
            {weeklyTokens} / {dynamicTarget} EcoTokens
          </ThemedText>
        </View>
      </ScrollView>

      {/* GOAL CELEBRATION MODAL */}
      <Modal
        transparent={true}
        visible={showCelebration}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.celebrationCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={{ fontSize: 50 }}>🎉</ThemedText>
            <ThemedText type="title" style={{ textAlign: 'center' }}>Weekly Goal Met!</ThemedText>
            <ThemedText style={{ textAlign: 'center', opacity: 0.7, marginVertical: 10 }}>
              You've hit your target of {dynamicTarget} EcoTokens. Your planet thanks you!
            </ThemedText>
            
            <Pressable 
              style={[styles.closeBtn, { backgroundColor: colors.tint }]} 
              onPress={() => setShowCelebration(false)}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Awesome!</ThemedText>
            </Pressable>
          </View>
          
          {/* The Confetti Cannon */}
          <ConfettiCannon 
            count={200} 
            origin={{x: -10, y: 0}} 
            fadeOut={true}
            explosionSpeed={350}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    //paddingTop: 30,
    gap: 16,
    // paddingBottom: 10,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 18,
  },

  subtle: {
    fontSize: 13,
    opacity: 0.6,
  },

  card: {
    padding: 16,
    borderRadius: 12,
    //backgroundColor: 'rgba(46,45,45,0.08)', // #2e2d2d14
    gap: 5
  },

  big: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 36,
  },

  progressBarBg: {
    height: 10,
    borderRadius: 5,
    //backgroundColor: 'rgba(0,0,0,0.1)', // #0000001a
    overflow: 'hidden',
    marginTop: 8,
  },

  progressBarFill: {
    height: '100%',
    //backgroundColor: '#2E7D32',
    borderRadius: 5,
  },

  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  streakItem: {
    alignItems: 'center',
    gap: 5,
  },

  dot: {
    width: 14,
    height: 14,
    borderRadius: 8,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },

  editButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },

  statsSummary: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    justifyContent: 'space-around',
  },

  miniStat: { alignItems: 'center' },
  miniStatVal: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  miniStatLabel: { color: '#ffffffcc', fontSize: 12 },
  divider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.2)' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    width: '80%',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
});

