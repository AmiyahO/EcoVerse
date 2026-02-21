// (tabs)/profile.tsx
import { View, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateStreak , calculateTokens, calculateCarbonSaved } from '@/src/utils/ecoLogic';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useRef } from 'react';
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
  // Set to start of today (local time)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calculate Sunday of this week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  // Array for 7 days starting from Sunday
  const dots = Array(7).fill(false);

  activities.forEach(a => {
    if (!a.date) return;
    
    const d = new Date(a.date);

    // Normalize activity date to midnight local time for accurate day-to-day comparison
    const activityDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // Check if the activity falls within the current week's range
    if(activityDate >= startOfWeek && activityDate <= today) {
      const dayIndex = activityDate.getDay(); 
      dots[dayIndex] = true;
    }
  });

  return dots;
}

export default function ProfileScreen() {
  const { colors, scheme } = useAppTheme();
  const userRegion = useActivityStore(s => s.userRegion);
  const activities = useActivityStore((state) => state.activities);
  const streak = calculateStreak(activities);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSecondCannon, setShowSecondCannon] = useState(false);
  const hasHydrated = useActivityStore(s => s._hasHydrated);
  
  // Real-time Firestore State
  const userProfile = useActivityStore(s => s.userProfile);
  const profile = userProfile; // keeps all the existing references working
  const loading = !userProfile; // simple loading state
  
  const celebrated = useActivityStore((state) => state.celebrated);
  const setCelebrated = useActivityStore((state) => state.setCelebrated);

  const dynamicTarget = profile?.weeklyTarget || 500;
  const prevTarget = useRef<number | null>(null);

  // Only attempt replacement if it's a googleusercontent URL
  const isGoogleImage = profile?.photoURL?.includes('googleusercontent.com');
  const highResPhoto = isGoogleImage 
  ? profile?.photoURL?.replace('=s96-c', '=s400-c') 
  : profile?.photoURL;

  // Calculate tokens BEFORE the effects so 'progress' is available
  const weeklyTokens = activities
    .filter((a) => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  const progress = Math.min(weeklyTokens / dynamicTarget, 1);
  const weeklyDots = getWeeklyActivityDots(activities);

  // Celebration Effect
  useEffect(() => {
    if (progress >= 1 && !loading && !celebrated && hasHydrated) {
      setShowCelebration(true);
      setTimeout(() => setShowSecondCannon(true), 300);
      setCelebrated(true);
    }
  }, [progress, loading, hasHydrated]);

  // Target change reset
  useEffect(() => {
    // Skip the initial mount — only react to actual changes
    if (prevTarget.current === null) {
      prevTarget.current = dynamicTarget;
      return;
    }
    
    if (prevTarget.current !== dynamicTarget) {
      const oldTarget = prevTarget.current; // save BEFORE updating
      prevTarget.current = dynamicTarget;

      // Only reset if new target is strictly higher AND progress no longer meets it
      if (dynamicTarget > oldTarget && progress < 1) {
        // Use a timeout to avoid state collision with Firestore snapshot
        setTimeout(() => setCelebrated(false), 300);
      }
    }
  }, [dynamicTarget]);

  // 5. Loading return comes AFTER all hooks are declared
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
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
              <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: highResPhoto || profile.photoURL }} 
                  style={styles.avatar} 
                />
              </View>
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
                <ThemedText style={styles.miniStatVal}>{activities.reduce((sum, a) => sum + calculateTokens(a), 0)}</ThemedText>
                <ThemedText style={styles.miniStatLabel}>Tokens</ThemedText>
             </View>
             <View style={styles.divider} />
             <View style={styles.miniStat}>
                <ThemedText style={styles.miniStatVal}>
                  {activities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0).toFixed(2)}
                </ThemedText>
                <ThemedText style={styles.miniStatLabel}>kg CO₂ total</ThemedText>
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
          <LinearGradient
            colors={scheme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#ffffff', '#f0fdf4']}
            style={styles.celebrationCard}
          >
            {/* Top accent bar */}
            <LinearGradient
              colors={['#2E7D32', '#34C9C9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.celebrationAccent}
            />

            <View style={[styles.celebrationIconWrapper, { backgroundColor: colors.tint + '20' }]}>
              <FontAwesome6 name="earth-americas" size={52} color={colors.tint} />
            </View>

            <ThemedText type="title" style={[styles.celebrationTitle, { color: colors.text }]}>
              Weekly Goal Crushed!
            </ThemedText>

            <ThemedText style={[styles.celebrationSubtitle, { color: colors.text }]}>
              You earned{' '}
              <ThemedText style={[styles.celebrationHighlight, { color: colors.tint }]}>
                {weeklyTokens} EcoTokens
              </ThemedText>
              {' '}this week — goal of {dynamicTarget} crushed! 🌱
            </ThemedText>

            {/* Stats row */}
            <View style={[styles.celebrationStats, { backgroundColor: colors.tint + '18' }]}>
              <View style={styles.celebrationStat}>
                <ThemedText style={[styles.celebrationStatVal, { color: colors.tint }]}>
                  {weeklyTokens}
                </ThemedText>
                <ThemedText style={[styles.celebrationStatLabel, { color: colors.text }]}>
                  Tokens
                </ThemedText>
              </View>
              <View style={[styles.celebrationStatDivider, { backgroundColor: colors.tint + '40' }]} />
              <View style={styles.celebrationStat}>
                <ThemedText style={[styles.celebrationStatVal, { color: colors.tint }]}>
                  {activities.filter(a => a.date && isThisWeek(a.date)).length}
                </ThemedText>
                <ThemedText style={[styles.celebrationStatLabel, { color: colors.text }]}>
                  Activities
                </ThemedText>
              </View>
            </View>

            <Pressable
              style={styles.celebrationBtn}
              onPress={() => {
                setShowCelebration(false);
                setShowSecondCannon(false);
              }}
            >
              <LinearGradient
                colors={['#2E7D32', '#34C9C9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.celebrationBtnGradient}
              >
                <ThemedText style={styles.celebrationBtnText}>Awesome! 🎉</ThemedText>
              </LinearGradient>
            </Pressable>
          </LinearGradient>

          <ConfettiCannon
            count={200}
            origin={{ x: -10, y: 0 }}
            fadeOut={true}
            explosionSpeed={400}
            fallSpeed={3000}
          />
          {/* Second cannon from the right */}
          {showSecondCannon && (
            <ConfettiCannon
              count={200}
              origin={{ x: 400, y: 0 }}
              fadeOut={true}
              explosionSpeed={400}
              fallSpeed={3000}
            />
          )}
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
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  avatarWrapper: {
    position: 'relative',
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
    justifyContent: 'space-evenly',
    alignContent: 'center',
  },

  miniStat: { 
    alignItems: 'center',
    flex: 1,        // each stat takes equal space
    paddingHorizontal: 4,
  },
  miniStatVal: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  miniStatLabel: { color: '#ffffffcc', fontSize: 12, textAlign: 'center', },
  divider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.2)' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    width: '80%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
    paddingTop: 0,
  },

  celebrationAccent: {
  height: 5,
  width: '100%',
  borderRadius: 3,
  marginBottom: 20,
},
celebrationTitle: {
  textAlign: 'center',
  fontSize: 26,
  fontWeight: '800',
  marginBottom: 10,
},
celebrationSubtitle: {
  textAlign: 'center',
  opacity: 0.75,
  fontSize: 15,
  lineHeight: 22,
  marginBottom: 20,
  paddingHorizontal: 10,
},
celebrationHighlight: {
  fontWeight: '700',
},
celebrationStats: {
  flexDirection: 'row',
  borderRadius: 14,
  padding: 16,
  width: '100%',
  justifyContent: 'space-around',
  marginBottom: 24,
},
celebrationStat: {
  alignItems: 'center',
  flex: 1,
},
celebrationStatVal: {
  fontSize: 22,
  fontWeight: '800',
},
celebrationStatLabel: {
  fontSize: 12,
  opacity: 0.6,
  marginTop: 2,
},
celebrationStatDivider: {
  width: 1,
  height: '80%',
  alignSelf: 'center',
},
celebrationBtn: {
  width: '100%',
  borderRadius: 14,
  overflow: 'hidden',
},
celebrationBtnGradient: {
  paddingVertical: 16,
  alignItems: 'center',
  borderRadius: 14,
},
celebrationBtnText: {
  color: '#fff',
  fontWeight: '800',
  fontSize: 16,
},

celebrationIconWrapper: {
  width: 90,
  height: 90,
  borderRadius: 45,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 16,
  marginTop: 8,
},
});

