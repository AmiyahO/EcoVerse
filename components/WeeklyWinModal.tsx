// components/WeeklyWinModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet,
  Animated, Pressable, Dimensions,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { playSound } from '@/src/utils/sfx';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  visible:     boolean;
  rank:        number;   // 1, 2, or 3
  score:       number;   // weeklyEcoScore they achieved
  tokens:      number;   // tokens awarded
  onClose:     () => void;
}

const RANK_META: Record<number, {
  medal: string;
  color: string;
  bg:    string;
  label: string;
  flavour: string;
}> = {
  1: {
    medal:   '🥇',
    color:   '#B8860B',
    bg:      '#FFF8DC',
    label:   '1st Place',
    flavour: 'You topped the leaderboard this week. The EcoVerse bows to you. 🌍',
  },
  2: {
    medal:   '🥈',
    color:   '#708090',
    bg:      '#F0F4F8',
    label:   '2nd Place',
    flavour: 'So close to the top — an incredible week of eco action.',
  },
  3: {
    medal:   '🥉',
    color:   '#8B4513',
    bg:      '#FDF3EC',
    label:   '3rd Place',
    flavour: "You made the podium! Every action you took this week mattered.",
  },
};

export function WeeklyWinModal({ visible, rank, score, tokens, onClose }: Props) {
  const { colors, scheme } = useAppTheme();
  const isDark  = scheme === 'dark';
  const meta    = RANK_META[rank] ?? RANK_META[3];

  const cardBg       = isDark ? '#0F1A0F' : '#FFFFFF';
  const textPrimary  = isDark ? '#FFFFFF'  : '#111111';
  const textMuted    = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const floatAnim   = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;

    scaleAnim.setValue(0);
    floatAnim.setValue(0);
    glowAnim.setValue(0);

    Animated.spring(scaleAnim, {
      toValue: 1, friction: 4, tension: 45, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 900, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    const t = setTimeout(() => {
      confettiRef.current?.start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound('level-up').catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [visible]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.38] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: meta.color + '88', transform: [{ scale: scaleAnim }] },
        ]}>
          {/* Pulsing glow */}
          <Animated.View style={[
            styles.bgGlow,
            { backgroundColor: meta.color, opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]} />

          {/* Colour accent strip */}
          <View style={[styles.topStrip, { backgroundColor: meta.color }]} />

          {/* Eyebrow */}
          <Text style={[styles.eyebrow, { color: meta.color }]}>
            LAST WEEK'S LEADERBOARD
          </Text>

          {/* Floating medal emoji */}
          <Animated.View style={[
            styles.medalWrap,
            { backgroundColor: meta.color + '22', transform: [{ translateY: floatAnim }] },
          ]}>
            <Text style={styles.medalEmoji}>{meta.medal}</Text>
          </Animated.View>

          {/* Rank badge */}
          <View style={[styles.rankPill, { backgroundColor: meta.color + '20', borderColor: meta.color + '55' }]}>
            <FontAwesome6 name="trophy" size={12} color={meta.color} />
            <Text style={[styles.rankPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textPrimary }]}>
            You made the podium!
          </Text>

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: meta.color + '30' }]} />

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: meta.color + '12' }]}>
              <FontAwesome6 name="ranking-star" size={14} color={meta.color} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{score}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>EcoScore</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#43A047' + '12' }]}>
              <FontAwesome6 name="leaf" size={14} color="#43A047" />
              <Text style={[styles.statValue, { color: textPrimary }]}>+{tokens}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>Tokens earned</Text>
            </View>
          </View>

          {/* Flavour text */}
          <ThemedText style={[styles.flavour, { color: textMuted }]}>
            {meta.flavour}
          </ThemedText>

          {/* CTA */}
          <Pressable
            style={[styles.button, { backgroundColor: meta.color }]}
            onPress={onClose}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <Text style={styles.buttonText}>Awesome!</Text>
          </Pressable>

          <Text style={[styles.hint, { color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)' }]}>
            Tokens have been added to your balance
          </Text>
        </Animated.View>

        {/* Confetti */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { elevation: 10, zIndex: 10 }]}>
          <ConfettiCannon
            ref={confettiRef}
            count={70}
            origin={{ x: SCREEN_W / 2, y: -10 }}
            autoStart={false}
            fadeOut
            explosionSpeed={280}
            fallSpeed={3200}
            colors={[meta.color, '#F9A825', '#42A5F5', '#EF5350', '#26C6DA', '#ffffff']}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: 24,
  },
  bgGlow: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    top: 40, alignSelf: 'center',
  },
  topStrip:   { width: '100%', height: 5, marginBottom: 18 },
  eyebrow:    { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 20 },
  medalWrap: {
    width: 96, height: 96, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  medalEmoji: { fontSize: 56 },
  rankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, marginBottom: 14,
  },
  rankPillText: { fontSize: 13, fontWeight: '700' },
  title: {
    fontSize: 24, fontWeight: '800', textAlign: 'center',
    letterSpacing: -0.3, marginBottom: 16, paddingHorizontal: 20,
  },
  separator: { width: '70%', height: 1, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, marginBottom: 16, width: '100%',
  },
  statBox: {
    flex: 1, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  flavour: {
    fontSize: 13, textAlign: 'center', lineHeight: 20,
    paddingHorizontal: 24, marginBottom: 24,
  },
  button: {
    borderRadius: 16, paddingHorizontal: 48,
    paddingVertical: 14, marginBottom: 14,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  hint:       { fontSize: 11, fontWeight: '500' },
});