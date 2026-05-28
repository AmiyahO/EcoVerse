// components/ocr-candidate-picker.tsx
// Shows the numbers ML Kit found in the bill photo and lets the user pick the right one.
import { View, Pressable, StyleSheet, Modal } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { OCRCandidate } from '@/src/services/billOCR';
import { CATEGORY_COLORS } from '@/src/utils/ecoLogic';

interface Props {
  visible: boolean;
  type: 'electricity' | 'water';
  candidates: OCRCandidate[];
  onSelect: (value: number) => void;
  onManual: () => void;   // user wants to type it themselves
  onRetry: () => void;    // scan again
  onClose: () => void;
}

const CONFIDENCE_LABEL: Record<OCRCandidate['confidence'], string> = {
  high:   'Strong match',
  medium: 'Possible match',
  low:    'Weak match',
};

const CONFIDENCE_COLOR: Record<OCRCandidate['confidence'], string> = {
  high:   '#4CAF50',
  medium: '#FFC107',
  low:    '#FF7043',
};

export default function OCRCandidatePicker({
  visible, type, candidates, onSelect, onManual, onRetry, onClose,
}: Props) {
  const { colors, scheme } = useAppTheme();
  const categoryColor = CATEGORY_COLORS[type];
  const unit = type === 'electricity' ? 'kWh' : 'L';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: scheme === 'dark' ? '#1E2420' : '#FFFFFF' }]}>
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.surfaceMuted }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: categoryColor + '18' }]}>
            <FontAwesome6
              name={type === 'electricity' ? 'bolt' : 'droplet'}
              size={14}
              color={categoryColor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 16 }}>
              Numbers found on bill
            </ThemedText>
            <ThemedText style={{ color: colors.text, opacity: 0.5, fontSize: 13 }}>
              Select your {type === 'electricity' ? 'kWh usage' : 'water usage in litres'}
            </ThemedText>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <FontAwesome6 name="xmark" size={16} color={colors.text} style={{ opacity: 0.4 }} />
          </Pressable>
        </View>

        {/* Candidates */}
        <View style={styles.candidateList}>
          {candidates.map((c, i) => (
            <Pressable
              key={i}
              onPress={() => onSelect(c.value)}
              style={({ pressed }) => [
                styles.candidateRow,
                { backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
                i === 0 && { borderWidth: 1, borderColor: categoryColor + '55' },
              ]}
            >
              {/* Best match badge */}
              {i === 0 && (
                <View style={[styles.bestBadge, { backgroundColor: categoryColor + '22' }]}>
                  <ThemedText style={{ fontSize: 10, fontWeight: '700', color: categoryColor }}>
                    BEST
                  </ThemedText>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.candidateValue, { color: colors.text }]}>
                  {c.value.toLocaleString()}
                  <ThemedText style={{ fontSize: 16, fontWeight: '400', opacity: 0.6 }}>
                    {' '}{unit}
                  </ThemedText>
                </ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.45, color: colors.text }}>
                  Found: "{c.raw}"
                </ThemedText>
              </View>

              {/* Confidence dot */}
              <View style={styles.confidenceWrap}>
                <View style={[styles.confidenceDot, { backgroundColor: CONFIDENCE_COLOR[c.confidence] }]} />
                <ThemedText style={{ fontSize: 11, opacity: 0.5, color: colors.text }}>
                  {CONFIDENCE_LABEL[c.confidence]}
                </ThemedText>
              </View>

              <FontAwesome6 name="chevron-right" size={12} color={colors.text} style={{ opacity: 0.25 }} />
            </Pressable>
          ))}
        </View>

        {/* Footer actions */}
        <View style={styles.footer}>
          <Pressable
            onPress={onRetry}
            style={[styles.footerBtn, { backgroundColor: colors.surface }]}
          >
            <FontAwesome6 name="camera-rotate" size={14} color={colors.text} style={{ opacity: 0.6 }} />
            <ThemedText style={{ color: colors.text, opacity: 0.6, fontSize: 14 }}>
              Scan again
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onManual}
            style={[styles.footerBtn, { backgroundColor: colors.surface }]}
          >
            <FontAwesome6 name="keyboard" size={14} color={colors.text} style={{ opacity: 0.6 }} />
            <ThemedText style={{ color: colors.text, opacity: 0.6, fontSize: 14 }}>
              Enter manually
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Shown when OCR found no usable numbers
export function OCRNoResultSheet({
  visible, onRetry, onManual, onClose, allText,
}: {
  visible: boolean;
  onRetry: () => void;
  onManual: () => void;
  onClose: () => void;
  allText: string;
}) {
  const { colors, scheme } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: scheme === 'dark' ? '#1E2420' : '#FFFFFF' }]}>
        <View style={[styles.handle, { backgroundColor: colors.surfaceMuted }]} />

        <View style={styles.noResultContent}>
          <View style={[styles.noResultIcon, { backgroundColor: colors.surfaceMuted }]}>
            <FontAwesome6 name="magnifying-glass" size={24} color={colors.text} style={{ opacity: 0.4 }} />
          </View>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 16, textAlign: 'center' }}>
            No reading found
          </ThemedText>
          <ThemedText style={{ color: colors.text, opacity: 0.5, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            Make sure the meter reading or total usage is clearly visible and well-lit. Try moving closer to the number.
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={onRetry}
            style={[styles.footerBtn, { backgroundColor: colors.surface }]}
          >
            <FontAwesome6 name="camera-rotate" size={14} color={colors.text} style={{ opacity: 0.6 }} />
            <ThemedText style={{ color: colors.text, opacity: 0.6, fontSize: 14 }}>Try again</ThemedText>
          </Pressable>
          <Pressable
            onPress={onManual}
            style={[styles.footerBtn, { backgroundColor: colors.surface }]}
          >
            <FontAwesome6 name="keyboard" size={14} color={colors.text} style={{ opacity: 0.6 }} />
            <ThemedText style={{ color: colors.text, opacity: 0.6, fontSize: 14 }}>Enter manually</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  candidateList: { gap: 8 },
  candidateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
  },
  bestBadge: {
    position: 'absolute', top: -1, right: -1,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, borderTopRightRadius: 12,
  },
  candidateValue: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  confidenceWrap: { alignItems: 'center', gap: 4 },
  confidenceDot:  { width: 8, height: 8, borderRadius: 4 },

  footer: { flexDirection: 'row', gap: 10 },
  footerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    padding: 13, borderRadius: 12,
  },

  noResultContent: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  noResultIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
});