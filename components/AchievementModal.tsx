// components/AchievementModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet,
  Animated, Pressable, Dimensions,
} from 'react-native';
import { FontAwesome6, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width: SCREEN_W } = Dimensions.get('window');

export interface AchievementInfo {
  id:    string;
  title: string;
  description: string;
  icon:  string;
  lib?:  'FA6' | 'MCO' | 'Ionicons';
  color: string;
}

interface Props {
  visible:     boolean;
  achievement: AchievementInfo | null;
  onClose:     () => void;
}

function AchievementIcon({ icon, lib, color, size }: { icon: string; lib?: string; color: string; size: number }) {
  if (lib === 'MCO') return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
  if (lib === 'Ionicons') return <Ionicons name={icon as any} size={size} color={color} />;
  return <FontAwesome6 name={icon as any} size={size} color={color} />;
}

export function AchievementModal({ visible, achievement, onClose }: Props) {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const cardBg      = isDark ? '#0F1A0F' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#111111';
  const textMuted   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';

  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (!visible || !achievement) return;

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
    }, 250);
    return () => clearTimeout(t);
  }, [visible]);

  if (!achievement) return null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.40] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1,    1.18] });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Confetti */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiCannon
          ref={confettiRef}
          count={60}
          origin={{ x: SCREEN_W / 2, y: -10 }}
          autoStart={false}
          fadeOut
          explosionSpeed={280}
          fallSpeed={3200}
          colors={[achievement.color, '#F9A825', '#42A5F5', '#EF5350', '#26C6DA', '#ffffff']}
        />
      </View>

      <View style={styles.overlay}>
        <Animated.View style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: achievement.color + '88', transform: [{ scale: scaleAnim }] },
        ]}>
          {/* Pulsing glow */}
          <Animated.View style={[
            styles.bgGlow,
            { backgroundColor: achievement.color, opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]} />

          {/* Colour accent strip */}
          <View style={[styles.topStrip, { backgroundColor: achievement.color }]} />

          {/* ACHIEVEMENT UNLOCKED label */}
          <Text style={[styles.eyebrow, { color: achievement.color }]}>
            ACHIEVEMENT UNLOCKED
          </Text>

          {/* Floating icon */}
          <Animated.View style={[
            styles.iconWrap,
            { backgroundColor: achievement.color + '22', transform: [{ translateY: floatAnim }] },
          ]}>
            <AchievementIcon icon={achievement.icon} lib={achievement.lib} color={achievement.color} size={54} />
          </Animated.View>

          {/* Badge pill */}
          <View style={[styles.badgePill, { backgroundColor: achievement.color + '20', borderColor: achievement.color + '55' }]}>
            <AchievementIcon icon={achievement.icon} lib={achievement.lib} color={achievement.color} size={14} />
            <Text style={[styles.badgePillText, { color: achievement.color }]}>
              New Badge
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textPrimary }]}>
            {achievement.title}
          </Text>

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: achievement.color + '30' }]} />

          {/* Description */}
          <ThemedText style={[styles.description, { color: textMuted }]}>
            {achievement.description}
          </ThemedText>

          {/* CTA */}
          <Pressable
            style={[styles.button, { backgroundColor: achievement.color }]}
            onPress={onClose}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <Text style={styles.buttonText}>Awesome!</Text>
          </Pressable>

          <Text style={[styles.hint, { color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)' }]}>
            View all badges in your Achievements
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
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 20,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  separator: {
    width: '70%',
    height: 1,
    marginBottom: 14,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 24,
    marginBottom: 24,
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