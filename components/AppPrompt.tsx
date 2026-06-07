// components/AppPrompt.tsx
//
// Reusable text-input modal — replaces Alert.prompt() (iOS-only) throughout EcoVerse.
//
// Usage:
//   import { appPrompt } from '@/components/AppPrompt';
//
//   appPrompt.show({
//     title: 'Confirm Password',
//     message: 'Enter your password to delete your account.',
//     placeholder: 'Password',
//     secure: true,
//     confirmLabel: 'Confirm',
//     destructive: true,
//     onConfirm: async (value) => { await doSomethingWith(value); },
//   });
//
// Mount <AppPromptHost /> once in app/_layout.tsx alongside <AppAlertHost />.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/useAppTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppPromptConfig {
  title:         string;
  message?:      string;
  placeholder?:  string;
  secure?:       boolean;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?:  string;
  destructive?:  boolean;
  icon?:         string;
  iconColor?:    string;
  onConfirm?:    (value: string) => void | Promise<void>;
  onCancel?:     () => void;
  validate?:     (value: string) => string | null;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

type ShowFn = (config: AppPromptConfig) => void;
const _listeners: Set<ShowFn> = new Set();
let _isShowing = false;
let _queue: AppPromptConfig[] = [];

export const appPrompt = {
  show(config: AppPromptConfig) {
    if (_isShowing) {
      _queue.push(config);
    } else {
      _isShowing = true;
      _listeners.forEach(fn => fn(config));
    }
  },
};

// ── Host ──────────────────────────────────────────────────────────────────────

export function AppPromptHost() {
  const [config,  setConfig]  = useState<AppPromptConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [value,   setValue]   = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef  = useRef<TextInput>(null);

  useEffect(() => {
    const show: ShowFn = (cfg) => {
      setConfig(cfg);
      setValue(cfg.initialValue ?? '');
      setError(null);
      setLoading(false);
      setFocused(false);
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
      ]).start(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [visible]);

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 45, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const dismiss = (cb?: () => void) => {
    Keyboard.dismiss();
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
      setValue('');
      setError(null);
      setLoading(false);
      _isShowing = false;
      Promise.resolve(cb?.()).finally(() => {
        if (_queue.length > 0) {
          const next = _queue.shift()!;
          setTimeout(() => appPrompt.show(next), 80);
        }
      });
    });
  };

  const handleConfirm = async () => {
    if (!config) return;
    const trimmed = value.trim();

    if (config.validate) {
      const err = config.validate(trimmed);
      if (err) { setError(err); shake(); return; }
    }
    if (!trimmed) {
      setError('This field is required.');
      shake();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await config.onConfirm?.(trimmed);
      dismiss();
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? 'Something went wrong. Please try again.');
      shake();
    }
  };

  if (!config) return null;

  const isDestructive = config.destructive ?? false;

  // Colours
  const overlay    = isDark ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.55)';
  const cardBg     = isDark ? '#1C1C1E' : '#FFFFFF';
  const textMain   = isDark ? '#F2F2F2' : '#0D0D0D';
  const textMuted  = isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.42)';
  const divider    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const inputBg     = isDark ? '#2A2A2C' : '#F4F4F6';
  const inputBorder = error
    ? '#EF5350'
    : focused
      ? colors.tint
      : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const iconName  = config.icon      ?? (isDestructive ? 'triangle-exclamation' : 'lock');
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
      onRequestClose={() => !loading && dismiss(config.onCancel)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.overlay, { backgroundColor: overlay, opacity: fadeAnim }]}>
          <Animated.View style={[
            styles.card,
            {
              backgroundColor: cardBg,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }, { translateX: shakeAnim }],
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
            <Text style={[styles.title, { color: textMain }]}>
              {config.title}
            </Text>

            {/* Message */}
            {config.message ? (
              <Text style={[styles.message, { color: textMuted }]}>
                {config.message}
              </Text>
            ) : null}

            {/* Input */}
            <View style={[
              styles.inputWrap,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                borderWidth: focused || error ? 1.5 : 1,
              },
            ]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: textMain }]}
                value={value}
                onChangeText={v => { setValue(v); if (error) setError(null); }}
                placeholder={config.placeholder ?? ''}
                placeholderTextColor={textMuted}
                secureTextEntry={config.secure ?? false}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleConfirm}
                returnKeyType="done"
              />
            </View>

            {/* Inline error */}
            {error ? (
              <View style={styles.errorRow}>
                <FontAwesome6 name="circle-exclamation" size={11} color="#EF5350" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: divider }]} />

            {/* Buttons */}
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: cancelBg, opacity: loading ? 0.45 : 1 }]}
                onPress={() => !loading && dismiss(config.onCancel)}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                disabled={loading}
              >
                <Text style={[styles.btnTextSecondary, { color: cancelColor }]}>
                  {config.cancelLabel ?? 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: confirmBg, opacity: loading ? 0.75 : 1 }]}
                onPress={handleConfirm}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                disabled={loading}
              >
                <Text style={styles.btnTextPrimary}>
                  {loading ? '…' : (config.confirmLabel ?? 'Confirm')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
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
  inputWrap: {
    width: '100%',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    flex: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 2,
    marginTop: -4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF5350',
    flex: 1,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 4,
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