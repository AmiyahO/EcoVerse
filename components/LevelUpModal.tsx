// components/LevelUpModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen modal that fires when the user crosses a level threshold.
// Uses Animated.spring for the "pop" entrance — same pattern as the weekly-goal
// celebration but bigger and more dramatic.  Confetti fires via the same
// ConfettiCannon already installed for the weekly goal.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getRankInfo } from '@/src/utils/levelSystem';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  newLevel: number;
  totalTokens: number;
  onClose: () => void;
}

export function LevelUpModal({ visible, newLevel, totalTokens, onClose }: Props) {
  // useAppTheme returns { scheme, colors } — derive isDark from scheme
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const rank = getRankInfo(newLevel);

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const rotateAnim  = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, { toValue: 1,  duration: 600, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: -1, duration: 600, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 0,  duration: 600, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start();

      const t = setTimeout(() => confettiRef.current?.start(), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const rotateInterpolated = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-12deg', '12deg'],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Confetti — fires from top centre */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiCannon
          ref={confettiRef}
          count={120}
          origin={{ x: SCREEN_W / 2, y: -10 }}
          autoStart={false}
          fadeOut
          colors={['#66BB6A', '#F9A825', '#42A5F5', '#EF5350', '#AB47BC', '#26C6DA']}
        />
      </View>

      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E2D1E' : '#FFFFFF',
              borderColor: rank.color,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Rank colour accent strip */}
          <View style={[styles.topStrip, { backgroundColor: rank.color }]} />

          {/* Wiggling emoji */}
          <Animated.Text
            style={[styles.emoji, { transform: [{ rotate: rotateInterpolated }] }]}
          >
            {rank.emoji}
          </Animated.Text>

          {/* LEVEL UP label */}
          <ThemedText style={[styles.levelUpLabel, { color: rank.color }]}>
            LEVEL UP!
          </ThemedText>

          {/* Level number */}
          <ThemedText style={styles.levelNumber}>Level {newLevel}</ThemedText>

          {/* Rank badge pill */}
          <View style={[styles.rankBadge, { backgroundColor: rank.color + '22', borderColor: rank.color }]}>
            <ThemedText style={[styles.rankName, { color: rank.color }]}>
              {rank.emoji}  {rank.name}
            </ThemedText>
          </View>

          {/* Flavour text — colors.text + opacity instead of missing textMuted */}
          <ThemedText style={[styles.subtitle, { color: colors.text, opacity: 0.6 }]}>
            {getRankFlavourText(newLevel)}
          </ThemedText>

          {/* CTA */}
          <Pressable
            style={[styles.button, { backgroundColor: rank.color }]}
            onPress={onClose}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <Text style={styles.buttonText}>Keep Going! 🌿</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getRankFlavourText(level: number): string {
  if (level === 2)  return 'Your first roots are growing. Keep logging!';
  if (level === 4)  return "You're becoming a true Sapling. The forest needs you.";
  if (level === 7)  return 'Grove Keeper — you tend the land with care.';
  if (level === 11) return 'Eco Guardian — the planet thanks you.';
  if (level === 16) return 'Oak Warden — your impact stands tall.';
  if (level === 21) return 'Forest Elder — your wisdom shapes the EcoVerse.';
  if (level === 31) return 'Eco Legend — you are the EcoVerse. 🌍';
  return `You've reached Level ${level}. Every step matters.`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: 28,
  },
  topStrip: {
    width: '100%',
    height: 6,
    marginBottom: 28,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  levelUpLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  levelNumber: {
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 16,
  },
  rankBadge: {
    borderRadius: 50,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 7,
    marginBottom: 16,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  button: {
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});