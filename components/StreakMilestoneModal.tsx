// components/StreakMilestoneModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet,
  Animated, Pressable, Dimensions,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  streakDays: number;  // 3 or 7 (or any future milestone)
  onClose: () => void;
}

const MILESTONES: Record<number, {
  color: string;
  title: string;
  subtitle: string;
  icon: string;
}> = {
  3: {
    color:    '#FF7043',
    title:    '3-Day Streak!',
    subtitle: "You're building a habit. Keep the momentum going — log again tomorrow!",
    icon:     'fire',
  },
  7: {
    color:    '#F9A825',
    title:    '7-Day Streak!',
    subtitle: "A full week of eco-action. That's real commitment — you're making a difference.",
    icon:     'fire-flame-curved',
  },
};

// Fallback for any future milestone
function getMilestone(days: number) {
  return MILESTONES[days] ?? {
    color:    '#FF7043',
    title:    `${days}-Day Streak!`,
    subtitle: `${days} days in a row. Keep it going!`,
    icon:     'fire',
  };
}

export function StreakMilestoneModal({ visible, streakDays, onClose }: Props) {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const milestone  = getMilestone(streakDays);
  const cardBg     = isDark ? '#1A1005' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#111111';
  const textMuted   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

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
        Animated.timing(floatAnim, { toValue: -8, duration: 800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    ).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          { backgroundColor: cardBg, borderColor: milestone.color + '88', transform: [{ scale: scaleAnim }] },
        ]}>
          {/* Pulsing glow */}
          <Animated.View style={[
            styles.bgGlow,
            { backgroundColor: milestone.color, opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]} />

          {/* Colour accent strip */}
          <View style={[styles.topStrip, { backgroundColor: milestone.color }]} />

          {/* Floating fire icon */}
          <Animated.View style={[
            styles.iconWrap,
            { backgroundColor: milestone.color + '22', transform: [{ translateY: floatAnim }] },
          ]}>
            <FontAwesome6 name={milestone.icon as any} size={56} color={milestone.color} />
          </Animated.View>

          {/* Streak number — big */}
          <Text style={[styles.streakNum, { color: milestone.color }]}>
            {streakDays}
          </Text>
          <Text style={[styles.streakLabel, { color: textMuted }]}>
            DAY STREAK
          </Text>

          {/* Title */}
          <Text style={[styles.title, { color: textPrimary }]}>
            {milestone.title}
          </Text>

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: milestone.color + '30' }]} />

          {/* Subtitle */}
          <ThemedText style={[styles.subtitle, { color: textMuted }]}>
            {milestone.subtitle}
          </ThemedText>

          {/* Streak pill showing current count */}
          <View style={[styles.streakPill, { backgroundColor: milestone.color + '18', borderColor: milestone.color + '40' }]}>
            <FontAwesome6 name="fire" size={12} color={milestone.color} />
            <Text style={[styles.streakPillText, { color: milestone.color }]}>
              {streakDays}-day streak active
            </Text>
          </View>

          {/* CTA */}
          <Pressable
            style={[styles.button, { backgroundColor: milestone.color }]}
            onPress={onClose}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <Text style={styles.buttonText}>Keep It Going!</Text>
          </Pressable>

          <Text style={[styles.hint, { color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)' }]}>
            Log tomorrow to extend your streak
          </Text>
        </Animated.View>
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
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 40,
    alignSelf: 'center',
  },
  topStrip: {
    width: '100%',
    height: 5,
    marginBottom: 28,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  streakNum: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 60,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  separator: {
    width: '70%',
    height: 1,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 20,
  },
  streakPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 14,
    marginBottom: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 11,
    fontWeight: '500',
  },
});