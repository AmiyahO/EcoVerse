// onboarding/_onboardingWrapper.tsx
import PagerView from 'react-native-pager-view';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import { useRef, ReactNode, useState, useEffect } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';

interface OnboardingWrapperProps {
  steps: ReactNode[];
  onFinish: () => void;
}

export default function OnboardingWrapper({ steps, onFinish }: OnboardingWrapperProps) {
  const pagerRef = useRef<PagerView>(null);
  const { scheme, colors } = useAppTheme();
  const isDark = scheme !== 'light';
  const [currentPage, setCurrentPage] = useState(0);

  const bg        = isDark ? '#0B1E14' : '#F0F7F1';
  const textColor = isDark ? '#fff'    : '#1B4332';
  const skipColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(27,67,50,0.45)';
  const barBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,67,50,0.08)';

  const dotWidths = useRef(steps.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    dotWidths.forEach((anim, idx) => {
      Animated.timing(anim, {
        toValue: idx === currentPage ? 1 : 0,
        duration: 280,
        useNativeDriver: false,
      }).start();
    });
  }, [currentPage]);

  const handleNext = () => {
    if (currentPage < steps.length - 1) {
      pagerRef.current?.setPage(currentPage + 1);
    } else {
      onFinish();
    }
  };

  const handleSkip = () => onFinish();
  const isLast = currentPage === steps.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PagerView
        style={{ flex: 1 }}
        initialPage={0}
        scrollEnabled={true}
        ref={pagerRef}
        onPageSelected={e => setCurrentPage(e.nativeEvent.position)}
      >
        {steps.map((step, i) => (
          <View key={i} style={{ flex: 1 }}>{step}</View>
        ))}
      </PagerView>

      {/* Bottom bar — pushed down with more paddingBottom so buttons sit lower */}
      <View style={[styles.bottomBar, {
        backgroundColor: bg,
        borderTopColor: barBorder,
      }]}>
        {/* Pill dots */}
        <View style={styles.dotsRow}>
          {steps.map((_, idx) => {
            const width = dotWidths[idx].interpolate({
              inputRange: [0, 1], outputRange: [8, 24],
            });
            const opacity = dotWidths[idx].interpolate({
              inputRange: [0, 1], outputRange: [0.3, 1],
            });
            return (
              <Animated.View
                key={idx}
                style={[
                  styles.dot,
                  {
                    width,
                    opacity,
                    backgroundColor: idx === currentPage
                      ? colors.tint
                      : (isDark ? '#ffffff' : '#1B4332'),
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {!isLast ? (
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: skipColor }]}>Skip</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Pressable onPress={handleNext} style={[styles.nextBtn, { backgroundColor: colors.tint }]}>
            <Text style={[styles.nextText, { color: '#fff' }]}>
              {isLast ? 'Get Started' : 'Next →'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 30,   // ← increased from 40 to push buttons lower toward nav bar
    paddingTop: 14,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  dot:     { height: 8, borderRadius: 4 },
  btnRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  skipText: { fontSize: 15, fontWeight: '500' },
  nextBtn: { flex: 2, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  nextText: { fontSize: 16, fontWeight: '700' },
});