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
//   // Info
//   appAlert.show({ title: 'Error', message: 'Something went wrong.' });
//
//   // Confirm (destructive)
//   appAlert.show({
//     title: 'Delete activity?',
//     message: 'This cannot be undone.',
//     variant: 'confirm',
//     confirmLabel: 'Delete',
//     destructive: true,
//     onConfirm: () => doDelete(),
//   });
//
//   // Confirm (non-destructive)
//   appAlert.show({
//     title: 'Log anyway?',
//     message: 'No saving detected. Log to track trends?',
//     variant: 'confirm',
//     confirmLabel: 'Log anyway',
//     onConfirm: () => doSave(),
//     onCancel: () => setSaving(false),
//   });
//
// Mount <AppAlertHost /> once at the root (app/_layout.tsx) so it's
// available from anywhere. The imperative API works across all screens.

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
  title:        string;
  message?:     string;
  variant?:     'info' | 'confirm';  // default: 'info'
  // Info variant
  dismissLabel?: string;             // default: 'OK'
  onDismiss?:    () => void;
  // Confirm variant
  confirmLabel?:  string;            // default: 'Confirm'
  cancelLabel?:   string;            // default: 'Cancel'
  destructive?:   boolean;           // confirm button shown in red
  onConfirm?:     () => void;
  onCancel?:      () => void;
  // Optional icon override (FontAwesome6 name)
  icon?:          string;
  iconColor?:     string;
}

// ── Singleton imperative API ───────────────────────────────────────────────────

type ShowFn = (config: AppAlertConfig) => void;

const _listeners: Set<ShowFn> = new Set();

export const appAlert = {
  show(config: AppAlertConfig) {
    _listeners.forEach(fn => fn(config));
  },
};

// ── Host component (mount once in app/_layout.tsx) ────────────────────────────

export function AppAlertHost() {
  const [config,  setConfig]  = useState<AppAlertConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  // Register with singleton
  useEffect(() => {
    const show: ShowFn = (cfg) => {
      setConfig(cfg);
      setVisible(true);
    };
    _listeners.add(show);
    return () => { _listeners.delete(show); };
  }, []);

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
      Haptics.impactAsync(
        config?.destructive
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light
      ).catch(() => {});
    }
  }, [visible]);

  const dismiss = (cb?: () => void) => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.88,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
      cb?.();
    });
  };

  if (!config) return null;

  const variant     = config.variant ?? 'info';
  const isDestructive = config.destructive ?? false;

  const cardBg    = isDark ? '#161616' : '#FFFFFF';
  const textMain  = isDark ? '#F2F2F2' : '#111111';
  const textMuted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  // Icon defaults per use case
  const iconName  = config.icon  ?? (isDestructive ? 'triangle-exclamation' : 'circle-info');
  const iconColor = config.iconColor ?? (isDestructive ? '#EF5350' : colors.tint);

  const confirmBg  = isDestructive ? '#EF5350' : colors.tint;
  const cancelBg   = isDark ? '#2A2A2A' : '#F0F0F0';
  const cancelText = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (variant === 'confirm') {
          dismiss(config.onCancel);
        } else {
          dismiss(config.onDismiss);
        }
      }}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: cardBg,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '14' }]}>
            <FontAwesome6 name={iconName as any} size={26} color={iconColor} />
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

          {/* Buttons */}
          {variant === 'info' ? (
            <Pressable
              style={[styles.btnFull, { backgroundColor: confirmBg }]}
              onPress={() => dismiss(config.onDismiss)}
              android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
            >
              <Text style={styles.btnTextLight}>
                {config.dismissLabel ?? 'OK'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: cancelBg }]}
                onPress={() => dismiss(config.onCancel)}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
              >
                <Text style={[styles.btnTextDark, { color: cancelText }]}>
                  {config.cancelLabel ?? 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: confirmBg }]}
                onPress={() => dismiss(config.onConfirm)}
                android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
              >
                <Text style={styles.btnTextLight}>
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
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 12,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 23,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  btnFull: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  btnHalf: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnTextLight: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnTextDark: {
    fontWeight: '600',
    fontSize: 15,
  },
});