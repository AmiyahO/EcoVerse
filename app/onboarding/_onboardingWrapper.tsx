// onboarding/_onboardingWrapper.tsx
import PagerView from 'react-native-pager-view';
import { View, Pressable, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRef, ReactNode, useState, useEffect } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';

interface OnboardingWrapperProps {
  steps: ReactNode[];
  onFinish: () => void;
}

export default function OnboardingWrapper({ steps, onFinish }: OnboardingWrapperProps) {
  const pagerRef = useRef<PagerView>(null);
  const { colors, scheme } = useAppTheme();
  const [currentPage, setCurrentPage] = useState(0);

  // Animated values for each dot
  const dotAnim = steps.map(() => useRef(new Animated.Value(0.3)).current);

  // Animate dot opacity & scale
  useEffect(() => {
    dotAnim.forEach((anim, idx) => {
      Animated.timing(anim, {
        toValue: idx === currentPage ? 1 : 0.3,
        duration: 250,
        useNativeDriver: true,
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

  return (
    <View style={{ flex: 1 }}>
      <PagerView
        style={{ flex: 1 }}
        initialPage={0}
        scrollEnabled={true}
        ref={pagerRef}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {steps.map((Step, i) => (
          <View key={i} style={{ flex: 1 }}>
            {Step}
          </View>
        ))}
      </PagerView>

      {/* Dot Pagination */}
      <View style={styles.dotsContainer}>
        {steps.map((_, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor: idx === currentPage ? colors.tint : colors.surfaceMuted,
                opacity: dotAnim[idx],
                transform: [
                  {
                    scale: dotAnim[idx].interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Next button overlay */}
      <Pressable style={styles.nextButtonWrapper} onPress={handleNext}>
        <LinearGradient
          colors={
            scheme === 'dark'
              ? ['#34C9C9', '#2E7D32']
              : ['#2E7D32', '#34C9C9']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nextButton}
        >
          <Text style={styles.nextText}>
            {currentPage === steps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dotsContainer: {
    position: 'absolute',
    bottom: 90,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nextButtonWrapper: {
    position: 'absolute',
    bottom: 40,
    right: 30,
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    },
  nextText: { 
    fontWeight: '600', 
    color: '#fff', 
    fontSize: 16 
},
});
