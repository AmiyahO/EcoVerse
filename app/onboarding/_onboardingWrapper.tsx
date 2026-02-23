// onboarding/_onboardingWrapper.tsx
import PagerView from 'react-native-pager-view';
import { View, Pressable, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRef, ReactNode, useState, useEffect } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width: W } = Dimensions.get('window');

interface OnboardingWrapperProps {
  steps: ReactNode[];
  onFinish: () => void;
}

export default function OnboardingWrapper({ steps, onFinish }: OnboardingWrapperProps) {
  const pagerRef = useRef<PagerView>(null);
  const { colors } = useAppTheme();
  const [currentPage, setCurrentPage] = useState(0);

  // Animated width for each dot (pill effect for active)
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
    <View style={{ flex: 1, backgroundColor: '#0B1E14' }}>
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

      {/* Bottom bar */}
      <View style={styles.bottomBar}>

        {/* Pill dots */}
        <View style={styles.dotsRow}>
          {steps.map((_, idx) => {
            const width = dotWidths[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [8, 24],
            });
            const opacity = dotWidths[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            });
            return (
              <Animated.View
                key={idx}
                style={[
                  styles.dot,
                  {
                    width,
                    opacity,
                    backgroundColor: idx === currentPage ? colors.tint : '#ffffff',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Buttons row */}
        <View style={styles.btnRow}>
          {!isLast ? (
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Pressable
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.nextText}>
              {isLast ? 'Get Started 🌱' : 'Next →'}
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
    paddingBottom: 40,
    paddingTop: 16,
    gap: 16,
    backgroundColor: '#0B1E14',
  },
  dotsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  dot:       { height: 8, borderRadius: 4 },
  btnRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipBtn:   { flex: 1, paddingVertical: 14, alignItems: 'center' },
  skipText:  { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '500' },
  nextBtn: {
    flex: 2, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
  },
  nextText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});