// components/AppAlert.tsx
//
// Replaces React Native's Alert.alert() throughout EcoVerse.
//
// Two variants:
//   info    — single dismiss button (errors, notices, permission messages)
//   confirm — two buttons: cancel (neutral) + confirm (tinted or destructive)
//
// Usage — imperative via the singleton ref (drop-in Alert.alert replacement):
//
//   import { appAlert } from '@/components/AppAlert';
//
//   appAlert.show({ title: 'Error', message: 'Something went wrong.' });
//
//   appAlert.show({
//     title: 'Delete activity?',
//     message: 'This cannot be undone.',
//     variant: 'confirm',
//     confirmLabel: 'Delete',
//     destructive: true,
//     onConfirm: () => doDelete(),
//   });
//
// Mount <AppAlertHost /> once at the root (app/_layout.tsx).

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/useAppTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppAlertConfig {
  title:         string;
  message?:      string;
  variant?:      'info' | 'confirm';
  dismissLabel?: string;
  onDismiss?:    () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?:  string;
  destructive?:  boolean;
  onConfirm?:    () => void | Promise<void>;
  onCancel?:     () => void | Promise<void>;
  icon?:         string;
  iconColor?:    string;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

type ShowFn = (config: AppAlertConfig) => void;
const _listeners: Set<ShowFn> = new Set();
let _queue: AppAlertConfig[] = [];
let _isShowing = false;

export const appAlert = {
  show(config: AppAlertConfig) {
    if (_isShowing) {
      _queue.push(config);
    } else {
      _isShowing = true;
      _listeners.forEach(fn => fn(config));
    }
  },
};

// ── Host ──────────────────────────────────────────────────────────────────────

export function AppAlertHost() {
  const [config,  setConfig]  = useState<AppAlertConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const show: ShowFn = (cfg) => {
      setConfig(cfg);
      setVisible(true);
    };
    _listeners.add(show);
    return () => { _listeners.delete(show); };
  }, []);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.92);
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, friction: 7, tension: 65, useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 180, useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, friction: 7, tension: 65, useNativeDriver: true,
        }),
      ]).start();
      Haptics.impactAsync(
        config?.destructive
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light
      ).catch(() => {});
    }
  }, [visible]);

  const dismiss = (cb?: (() => void) | (() => Promise<void>)) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.94, duration: 120, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 120, useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
      _isShowing = false;
      Promise.resolve(cb?.()).finally(() => {
        if (_queue.length > 0) {
          const next = _queue.shift()!;
          setTimeout(() => appAlert.show(next), 80);
        }
      });
    });
  };

  if (!config) return null;

  const variant     = config.variant ?? 'info';
  const isDestructive = config.destructive ?? false;

  // Colours
  const overlay   = isDark ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.55)';
  const cardBg    = isDark ? '#1C1C1E' : '#FFFFFF';
  const textMain  = isDark ? '#F2F2F2' : '#0D0D0D';
  const textMuted = isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.42)';
  const divider   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const iconName  = config.icon ?? (isDestructive ? 'triangle-exclamation' : 'circle-info');
  const iconColor = config.iconColor ?? (isDestructive ? '#EF5350' : colors.tint);
  const accentColor = iconColor;

  const confirmBg   = isDestructive ? '#EF5350' : colors.tint;
  const cancelBg    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.055)';
  const cancelColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => variant === 'confirm' ? dismiss(config.onCancel) : dismiss(config.onDismiss)}
    >
      <Animated.View style={[styles.overlay, { backgroundColor: overlay, opacity: fadeAnim }]}>
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: cardBg,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
          },
        ]}>
          {/* Accent strip */}
          <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: accentColor + '18' }]}>
            <FontAwesome6 name={iconName as any} size={24} color={accentColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textMain }]} numberOfLines={3}>
            {config.title}
          </Text>

          {/* Message */}
          {config.message ? (
            <Text style={[styles.message, { color: textMuted }]}>
              {config.message}
            </Text>
          ) : null}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: divider }]} />

          {/* Buttons */}
          {variant === 'info' ? (
            <Pressable
              style={[styles.btnFull, { backgroundColor: confirmBg }]}
              onPress={() => dismiss(config.onDismiss)}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={styles.btnTextPrimary}>
                {config.dismissLabel ?? 'OK'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: cancelBg }]}
                onPress={() => dismiss(config.onCancel)}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
              >
                <Text style={[styles.btnTextSecondary, { color: cancelColor }]}>
                  {config.cancelLabel ?? 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: confirmBg }]}
                onPress={() => dismiss(config.onConfirm)}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={styles.btnTextPrimary}>
                  {config.confirmLabel ?? 'Confirm'}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: 20,
    paddingHorizontal: 22,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  accentStrip: {
    width: '100%',
    height: 4,
    marginBottom: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 4,
  },
  btnFull: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  btnHalf: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnTextPrimary: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  btnTextSecondary: {
    fontWeight: '600',
    fontSize: 15,
  },
});