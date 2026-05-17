// components/streak-calendar-sheet.tsx
import { Modal, View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';
import React from 'react';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getActiveDaysInMonth(activities: any[], year: number, month: number): Set<number> {
  const active = new Set<number>();
  activities.forEach(a => {
    if (!a.date) return;
    const d = new Date(a.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      active.add(d.getDate());
    }
  });
  return active;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function countActiveDays(active: Set<number>) {
  return active.size;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  activities: any[];
  streak: number;
  longestStreak?: number;
}

export default function StreakCalendarSheet({ visible, onClose, activities, streak, longestStreak = 0 }: Props) {
  const { colors, scheme } = useAppTheme();

  const today = new Date();
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const [viewYear, setViewYear] = React.useState(today.getFullYear());

  const activeDays = getActiveDaysInMonth(activities, viewYear, viewMonth);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const activeDayCount = countActiveDays(activeDays);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const isToday = (day: number) => isCurrentMonth && day === today.getDate();

  const sheetBg = scheme === 'dark' ? '#1A1F1B' : '#FFFFFF';

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goForward = () => {
    // Don't go past current month
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid — leading empty cells + day cells
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  // All-time stats for this month
  const allTimeActive = activities.reduce((acc, a) => {
    if (!a.date) return acc;
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    acc.add(key);
    return acc;
  }, new Set<string>()).size;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: sheetBg }]} onPress={e => e.stopPropagation()}>

          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.text + '20' }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <ThemedText style={[styles.title, { color: colors.text }]}>Activity History</ThemedText>
              <View style={styles.streakRow}>
                <FontAwesome6
                  name="fire"
                  size={13}
                  color={streak > 0 ? '#FF7043' : colors.text}
                  style={{ opacity: streak > 0 ? 1 : 0.3 }}
                />
                <ThemedText style={[styles.streakText, {
                  color: streak > 0 ? '#FF7043' : colors.text,
                  opacity: streak > 0 ? 1 : 0.4,
                }]}>
                  {streak > 0 ? `${streak}-day streak` : 'No active streak'}
                </ThemedText>
                {longestStreak > 0 && (
                  <View style={[styles.longestPill, {
                    backgroundColor: (streak >= longestStreak ? '#FFD166' : colors.tint) + '20',
                    borderWidth: 1,
                    borderColor: (streak >= longestStreak ? '#FFD166' : colors.tint) + '45',
                  }]}>
                    <FontAwesome6
                      name="trophy"
                      size={10}
                      color={streak >= longestStreak ? '#FFD166' : colors.tint}
                    />
                    <ThemedText style={[styles.longestText, {
                      color: streak >= longestStreak ? '#FFD166' : colors.tint,
                    }]}>
                      {streak >= longestStreak ? `PB ${longestStreak}d` : `Best ${longestStreak}d`}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceMuted }]}>
              <FontAwesome6 name="xmark" size={13} color={colors.text} />
            </Pressable>
          </View>

          {/* Month navigator */}
          <View style={styles.monthNav}>
            <Pressable onPress={goBack} style={[styles.navBtn, { backgroundColor: colors.surfaceMuted }]} hitSlop={8}>
              <FontAwesome6 name="chevron-left" size={12} color={colors.text} />
            </Pressable>
            <ThemedText style={[styles.monthLabel, { color: colors.text }]}>
              {getMonthLabel(viewYear, viewMonth)}
            </ThemedText>
            <Pressable
              onPress={goForward}
              style={[styles.navBtn, { backgroundColor: colors.surfaceMuted, opacity: isCurrentMonth ? 0.3 : 1 }]}
              hitSlop={8}
              disabled={isCurrentMonth}
            >
              <FontAwesome6 name="chevron-right" size={12} color={colors.text} />
            </Pressable>
          </View>

          {/* Weekday header row */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((d, i) => (
              <ThemedText key={i} style={[styles.weekdayLabel, { color: colors.text }]}>{d}</ThemedText>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.calRow}>
                {row.map((day, ci) => {
                  if (!day) return <View key={ci} style={styles.dayCell} />;
                  const isActive = activeDays.has(day);
                  const todayCell = isToday(day);
                  const isFuture = isCurrentMonth && day > today.getDate();
                  const textColor = isActive
                    ? '#fff'
                    : todayCell
                    ? colors.tint
                    : isFuture
                    ? colors.text + '30'
                    : colors.text;
                  return (
                    <View key={ci} style={styles.dayCell}>
                      {/* Outer ring for today */}
                      {todayCell && !isActive && (
                        <View style={[styles.dayRing, { borderColor: colors.tint }]} />
                      )}
                      {/* Fill circle for active days */}
                      {isActive && (
                        <View style={[styles.dayFill, { backgroundColor: colors.tint }]} />
                      )}
                      {/* Number — always on top, never clipped */}
                      <ThemedText style={[
                        styles.dayText,
                        { color: textColor, fontWeight: todayCell ? '700' : '500' },
                      ]}>
                        {day}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Month summary */}
          <View style={[styles.summaryRow, { backgroundColor: colors.surfaceMuted + '80', borderRadius: 12 }]}>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryVal, { color: colors.tint }]}>{activeDayCount}</ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: colors.text }]}>Active days</ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.text + '15' }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryVal, { color: colors.tint }]}>
                {daysInMonth - (isCurrentMonth ? daysInMonth - today.getDate() : 0)}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: colors.text }]}>Days elapsed</ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.text + '15' }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryVal, { color: colors.tint }]}>
                {activeDayCount === 0 ? '0' : Math.round(
                  (activeDayCount / (isCurrentMonth ? today.getDate() : daysInMonth)) * 100
                )}%
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: colors.text }]}>Consistency</ThemedText>
            </View>
          </View>

          <View style={{ height: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  streakText: { fontSize: 13, fontWeight: '600' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  longestPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 4,
  },
  longestText: { fontSize: 11, fontWeight: '700' },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { fontSize: 15, fontWeight: '700' },

  // Calendar
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 12, fontWeight: '600',
    opacity: 0.4,
  },
 calendarGrid: {},
  calRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRing: {
    position: 'absolute',
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5,
  },
  dayFill: {
    position: 'absolute',
    width: 34, height: 34, borderRadius: 17,
  },
  dayText: { fontSize: 13 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    marginTop: 20,
    padding: 14,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryVal: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, opacity: 0.5, textAlign: 'center' },
  summaryDivider: { width: 1, marginHorizontal: 8, alignSelf: 'stretch' },
});