// components/LevelUpModal.tsx
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const rank = getRankInfo(newLevel);

  const scaleAnim    = useRef(new Animated.Value(0)).current;
  const floatAnim    = useRef(new Animated.Value(0)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;
  const confettiRef  = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      floatAnim.setValue(0);
      glowAnim.setValue(0);

      // Card pops in with spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 45,
        useNativeDriver: true,
      }).start();

      // Emoji floats up and down continuously
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -10, duration: 900, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0,   duration: 900, useNativeDriver: true }),
        ])
      ).start();

      // Glow pulses
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
    }
  }, [visible]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

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
          count={70}
          origin={{ x: SCREEN_W / 2, y: -10 }}
          autoStart={false}
          fadeOut
          explosionSpeed={300}
          fallSpeed={3000}
          colors={['#66BB6A', '#F9A825', '#42A5F5', '#EF5350', '#AB47BC', '#26C6DA', '#ffffff']}
        />
      </View>

      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#0F1F0F' : '#FFFFFF',
              borderColor: rank.color + '88',
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Pulsing background glow circle */}
          <Animated.View
            style={[
              styles.bgGlow,
              {
                backgroundColor: rank.color,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Rank colour accent strip at top */}
          <View style={[styles.topStrip, { backgroundColor: rank.color }]} />

          {/* Floating rank icon */}
          <Animated.View style={[styles.iconWrap, { backgroundColor: rank.color + '22', transform: [{ translateY: floatAnim }] }]}>
            <MaterialCommunityIcons name={rank.icon as any} size={64} color={rank.color} />
          </Animated.View>

          {/* LEVEL UP heading */}
          <Text style={[styles.levelUpLabel, { color: rank.color }]}>
            LEVEL UP!
          </Text>

          {/* Level number — big and bold */}
          <Text style={[styles.levelNumber, { color: isDark ? '#fff' : '#111' }]}>
            Level {newLevel}
          </Text>

          {/* Rank badge pill */}
          <View style={[styles.rankBadge, { backgroundColor: rank.color + '25', borderColor: rank.color }]}>
            <MaterialCommunityIcons name={rank.icon as any} size={16} color={rank.color} />
            <Text style={[styles.rankName, { color: rank.color }]}>
              {rank.name}
            </Text>
          </View>

          {/* Thin separator */}
          <View style={[styles.separator, { backgroundColor: rank.color + '30' }]} />

          {/* Flavour text */}
          <ThemedText style={[styles.subtitle, { color: colors.text, opacity: 0.65 }]}>
            {getRankFlavourText(newLevel)}
          </ThemedText>

          {/* CTA button */}
          <Pressable
            style={[styles.button, { backgroundColor: rank.color }]}
            onPress={onClose}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <Text style={styles.buttonText}>Keep Going!</Text>
          </Pressable>

          {/* Small next-level hint */}
          <Text style={[styles.nextHint, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>
            Keep logging to reach Level {newLevel + 1}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getRankFlavourText(level: number): string {
  if (level === 2)  return 'Your first roots are growing.\nKeep logging!';
  if (level === 4)  return "You're becoming a true Sapling.\nThe forest needs you.";
  if (level === 7)  return 'Grove Keeper — you tend the land with care.';
  if (level === 11) return 'Eco Guardian — the planet thanks you.';
  if (level === 16) return 'Oak Warden — your impact stands tall.';
  if (level === 21) return 'Forest Elder — your wisdom shapes the EcoVerse.';
  if (level === 31) return 'Eco Legend — you are the EcoVerse. 🌍';
  return `You've reached Level ${level}.\nEvery step matters.`;
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
    width: 220,
    height: 220,
    borderRadius: 110,
    top: 30,
    alignSelf: 'center',
  },
  topStrip: {
    width: '100%',
    height: 5,
    marginBottom: 32,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  levelUpLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 6,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -1,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
  },
  rankName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  separator: {
    width: '75%',
    height: 1,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 28,
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
  nextHint: {
    fontSize: 11,
    fontWeight: '500',
  },
});