// components/AnimatedSplash.tsx
//
// Full-screen animated splash screen.
// Shown in place of the blank loading screen on cold boot / fresh login.
// Uses expo-linear-gradient (already in project) for the radial-style gradient.
// Uses the app_icon.png asset (transparent PNG) for the logo.
//
// Animation sequence:
//   0ms    — gradient background visible immediately
//   0ms    — icon springs in (scale 0 → 1 with spring overshoot)
//   180ms  — "EcoVerse" fades + slides up
//   360ms  — "Track your impact." fades + slides up
//   hold   — stays visible until onFinish() is called by parent
//   exit   — parent fades its own content in; this component unmounts

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
  isDark: boolean;
}

export function AnimatedSplash({ onFinish, isDark }: Props) {
  // ── Animated values ──────────────────────────────────────────────────────────
  const iconScale   = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY       = useRef(new Animated.Value(14)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const tagY        = useRef(new Animated.Value(10)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  // ── Gradient colours ─────────────────────────────────────────────────────────
  // Light: warm lime centre → mid green → deep forest edge
  // Dark:  soft teal glow centre → deep forest → near-black edge
  const gradientColors = isDark
    ? ['#165530', '#0b3320', '#05220c', '#020804'] as const
    : ['#9BD455', '#55A530', '#2a7828', '#144214'] as const;

  // ── Sequence ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.sequence([
      // 1. Icon springs in
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),

      // 2. "EcoVerse" fades up (180ms after icon starts)
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(nameY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),

      // 3. Tagline fades up
      Animated.parallel([
        Animated.timing(tagOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(tagY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),

      // 4. Hold
      Animated.delay(600),

      // 5. Fade everything out
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 340,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  const textColor = isDark ? '#5CDD8B' : '#FFFFFF';
  const tagColor  = isDark ? 'rgba(92,221,139,0.65)' : 'rgba(255,255,255,0.7)';

  return (
    <Animated.View style={[styles.root, { opacity: exitOpacity }]}>
      {/* Gradient background — 4 stops simulate a radial glow from centre */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        // LinearGradient is top-to-bottom by default; we use start/end to
        // simulate the radial effect by going from centre-top to bottom-edge
        start={{ x: 0.5, y: 0.0 }}
        end={{ x: 0.5, y: 1.0 }}
      />

      {/* Content */}
      <View style={styles.content}>

        {/* Icon */}
        <Animated.View style={[
          styles.iconWrap,
          {
            opacity:   iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}>
          <Image
            source={require('../assets/images/app-icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[
          styles.appName,
          {
            color:   textColor,
            opacity: nameOpacity,
            transform: [{ translateY: nameY }],
          },
        ]}>
          EcoVerse
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[
          styles.tagline,
          {
            color:   tagColor,
            opacity: tagOpacity,
            transform: [{ translateY: tagY }],
          },
        ]}>
          Track YOUR IMPACT.
        </Animated.Text>
      </View>

      {/* Sparkle — bottom right, mirrors the app icon */}
      <Animated.View style={[styles.sparkle, { opacity: tagOpacity }]}>
        <View style={[styles.sparkleShape, { backgroundColor: isDark ? '#5CDD8B' : '#ffffff' }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 0,
  },
  iconWrap: {
    marginBottom: 24,
  },
  icon: {
    width: 160,
    height: 160,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  // Simple 4-pointed star shape using two overlapping rectangles
  sparkle: {
    position: 'absolute',
    bottom: 48,
    right: 36,
  },
  sparkleShape: {
    width: 12,
    height: 12,
    borderRadius: 1,
    opacity: 0.5,
    transform: [{ rotate: '45deg' }],
  },
});