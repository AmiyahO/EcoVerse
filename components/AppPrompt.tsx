// components/AppPrompt.tsx
//
// Reusable text-input modal — replaces Alert.prompt() (iOS-only) throughout EcoVerse.
//
// Usage — imperative via the singleton:
//
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
//     onCancel: () => {},
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
  title:          string;
  message?:       string;
  placeholder?:   string;
  secure?:        boolean;          // secure text entry (passwords)
  initialValue?:  string;
  confirmLabel?:  string;           // default: 'Confirm'
  cancelLabel?:   string;           // default: 'Cancel'
  destructive?:   boolean;          // confirm button shown in red
  icon?:          string;           // FontAwesome6 icon name
  iconColor?:     string;
  onConfirm?:     (value: string) => void | Promise<void>;
  onCancel?:      () => void;
  // Optional validation — return an error string to block confirm, or null to allow
  validate?:      (value: string) => string | null;
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

  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef  = useRef<TextInput>(null);

  useEffect(() => {
    const show: ShowFn = (cfg) => {
      setConfig(cfg);
      setValue(cfg.initialValue ?? '');
      setError(null);
      setLoading(false);
      setVisible(true);
    };
    _listeners.add(show);
    return () => { _listeners.delete(show); };
  }, []);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, friction: 6, tension: 60, useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 160, useNativeDriver: true,
        }),
      ]).start(() => {
        // Focus input after animation
        setTimeout(() => inputRef.current?.focus(), 50);
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [visible]);

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 50, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const dismiss = (cb?: () => void) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.88, friction: 8, tension: 80, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 130, useNativeDriver: true,
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

    // Run validation if provided
    if (config.validate) {
      const err = config.validate(trimmed);
      if (err) {
        setError(err);
        shake();
        return;
      }
    }

    // Basic empty check
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
      // Surface the error inline rather than crashing
      setError(e?.message ?? 'Something went wrong. Please try again.');
      shake();
    }
  };

  if (!config) return null;

  const isDestructive = config.destructive ?? false;
  const cardBg    = isDark ? '#161616' : '#FFFFFF';
  const textMain  = isDark ? '#F2F2F2' : '#111111';
  const textMuted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const inputBg   = isDark ? '#242424' : '#F5F5F5';
  const inputBorder = error
    ? '#EF5350'
    : isDark ? '#333333' : '#E0E0E0';

  const iconName  = config.icon      ?? (isDestructive ? 'triangle-exclamation' : 'lock');
  const iconColor = config.iconColor ?? (isDestructive ? '#EF5350' : colors.tint);
  const confirmBg = isDestructive ? '#EF5350' : colors.tint;
  const cancelBg  = isDark ? '#2A2A2A' : '#F0F0F0';
  const cancelText = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => !loading && dismiss(config.onCancel)}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View style={[
            styles.card,
            {
              backgroundColor: cardBg,
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}>
            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: iconColor + '14' }]}>
              <FontAwesome6 name={iconName as any} size={26} color={iconColor} />
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
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
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
                onSubmitEditing={handleConfirm}
                returnKeyType={isDestructive ? 'done' : 'go'}
              />
            </View>

            {/* Inline error */}
            {error ? (
              <View style={styles.errorRow}>
                <FontAwesome6 name="circle-exclamation" size={11} color="#EF5350" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Buttons */}
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: cancelBg, opacity: loading ? 0.5 : 1 }]}
                onPress={() => !loading && dismiss(config.onCancel)}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                disabled={loading}
              >
                <Text style={[styles.btnTextDark, { color: cancelText }]}>
                  {config.cancelLabel ?? 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btnHalf, { backgroundColor: confirmBg, opacity: loading ? 0.7 : 1 }]}
                onPress={handleConfirm}
                android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                disabled={loading}
              >
                <Text style={styles.btnTextLight}>
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
  keyboardView: {
    flex: 1,
  },
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
  },
  inputWrap: {
    width: '100%',
    borderWidth: 1.5,
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
  },
  errorText: {
    fontSize: 12,
    color: '#EF5350',
    flex: 1,
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