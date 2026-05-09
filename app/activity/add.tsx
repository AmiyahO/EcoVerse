// activity/add.tsx
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ActivityCategory, useActivityStore } from '@/src/store/activityStore';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import {
  Pressable, StyleSheet, TextInput, View,
  Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { db, auth } from '@/src/firebase/config';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import {
  calculateFinalTokens, calculateStreak, calculateCarbonSaved, calculateTokens,
  BASELINES, CATEGORY_COLORS, persistWeeklyEcoScore, getRegionalBaseline,
} from '@/src/utils/ecoLogic';
import {
  getLastBill, calculateSaving, saveBillReading, BillReading,
} from '@/src/services/billService';
import { scanBillFromCamera, OCRCandidate } from '@/src/services/billOCR';
import OCRCandidatePicker, { OCRNoResultSheet } from '@/components/ocr-candidate-picker';
import HealthConnectBanner from '@/components/health-connect-banner';

const ACTIVITY_CATEGORIES = [
  { key: 'walking',     label: 'Walking',     icon: 'person-walking' },
  { key: 'running',     label: 'Running',     icon: 'person-running' },
  { key: 'cycling',     label: 'Cycling',     icon: 'bicycle' },
  { key: 'electricity', label: 'Electricity', icon: 'bolt' },
  { key: 'water',       label: 'Water',       icon: 'droplet' },
] as const;

type BillCategory = 'electricity' | 'water';
function isBillCategory(c: ActivityCategory | null): c is BillCategory {
  return c === 'electricity' || c === 'water';
}

// ── Date helpers (same as edit.tsx — no separate dateUtils needed) ────────────

function toLocalISOString(date: Date): string {
  const y   = date.getFullYear();
  const mo  = String(date.getMonth() + 1).padStart(2, '0');
  const d   = String(date.getDate()).padStart(2, '0');
  const h   = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s   = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${min}:${s}`; // local time, no Z
}

function formatDisplayDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today))     return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AddActivityScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const activities    = useActivityStore(s => s.activities);
  const userRegion    = useActivityStore(s => s.userRegion);
  const userProfile   = useActivityStore(s => s.userProfile);
  const setCelebrated = useActivityStore(s => s.setCelebrated);
  const celebrated    = useActivityStore(s => s.celebrated);
  const streak        = calculateStreak(activities);

  const [category, setCategory]       = useState<ActivityCategory | null>(null);
  const [steps, setSteps]             = useState('');
  const [distance, setDistance]       = useState('');
  const [duration, setDuration]       = useState('');
  const [billReading, setBillReading] = useState('');
  const [lastBill, setLastBill]       = useState<BillReading | null>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [hcAutoFilled, setHcAutoFilled] = useState(false);
  const saveInProgress = useRef(false);

  // Date state — defaults to today, user can back-date
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // OCR state
  const [scanning, setScanning]           = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<OCRCandidate[]>([]);
  const [showPicker, setShowPicker]       = useState(false);
  const [showNoResult, setShowNoResult]   = useState(false);

  const lastFetchedCategory = useRef<string | null>(null);

  const resetInputs = () => {
    setSteps('');
    setDistance('');
    setDuration('');
    setBillReading('');
    setLastBill(null);
    setHcAutoFilled(false);
    lastFetchedCategory.current = null;
    setOcrCandidates([]);
    setShowPicker(false);
    setShowNoResult(false);
  };

  useEffect(() => {
    if (isBillCategory(category) && lastFetchedCategory.current !== category) {
      lastFetchedCategory.current = category;
      setLastBill(null);
      setBillReading('');
      setLoadingBill(true);
      getLastBill(category)
        .then(bill => setLastBill(bill))
        .finally(() => setLoadingBill(false));
    }
  }, [category]);

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      // Clamp to today — no future dates
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      setSelectedDate(date > today ? today : date);
    }
  };

  const handleScan = async () => {
    if (!isBillCategory(category)) return;
    setScanning(true);
    const result = await scanBillFromCamera(category);
    setScanning(false);

    switch (result.status) {
      case 'success':
        setOcrCandidates(result.candidates);
        setShowPicker(true);
        break;
      case 'no_candidates':
        setShowNoResult(true);
        break;
      case 'permission_denied':
        Alert.alert('Camera permission needed', 'Please allow camera access in Settings to scan bills.');
        break;
      case 'cancelled':
        break;
      case 'error':
        Alert.alert('Scan failed', 'Could not read the bill. Please try again or enter manually.');
        break;
    }
  };

  const handleOCRSelect = (value: number) => {
    setBillReading(String(value));
    setShowPicker(false);
  };

  const previewSaving = () => {
    if (!isBillCategory(category)) return null;
    const reading = parseFloat(billReading);
    if (!billReading || isNaN(reading) || reading <= 0) return null;
    const regionalBaseline = getRegionalBaseline(category, userRegion ?? 'GLOBAL_AVG');
    return calculateSaving(category, reading, lastBill?.reading ?? null, regionalBaseline);
  };

  const handleSave = async () => {
    if (!auth.currentUser || !category || saveInProgress.current) return;
    saveInProgress.current = true;
    setSaving(true);

    try {
      if (isBillCategory(category)) {
        const reading = parseFloat(billReading);
        if (isNaN(reading) || reading <= 0) {
          Alert.alert('Invalid reading', 'Please enter a valid meter reading greater than 0.');
          setSaving(false);
          saveInProgress.current = false;
          return;
        }

        const { savedAmount, basedOnPrevious } = calculateSaving(
          category, reading, lastBill?.reading ?? null,
          getRegionalBaseline(category, userRegion ?? 'GLOBAL_AVG'),
        );

        const doSave = async () => {
          const savedBill   = await saveBillReading(category, reading, savedAmount, basedOnPrevious);
          const kwhSaved    = category === 'electricity' ? savedAmount : undefined;
          const litersSaved = category === 'water'       ? savedAmount : undefined;
          await commitActivity({ kwhSaved, litersSaved, billId: savedBill?.id });
        };

        if (savedAmount === 0) {
          Alert.alert(
            'No saving detected',
            lastBill
              ? `Your usage this month (${reading.toLocaleString()}) is higher than or equal to your previous reading (${lastBill.reading.toLocaleString()}). Log anyway to track trends?`
              : `Your usage exceeds the average household baseline. Log anyway to track trends?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => { setSaving(false); saveInProgress.current = false; } },
              { text: 'Log anyway', onPress: async () => { await doSave(); setSaving(false); saveInProgress.current = false; } },
            ]
          );
          return;
        }

        await doSave();
      } else {
        await commitActivity({});
      }
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Error', 'Could not save activity. Please try again.');
    } finally {
      setSaving(false);
      saveInProgress.current = false;
    }
  };

  const commitActivity = async ({
    kwhSaved,
    litersSaved,
    billId,
  }: {
    kwhSaved?: number;
    litersSaved?: number;
    billId?: string;
  }) => {
    if (!auth.currentUser || !category) return;

    const rawData = {
      category,
      steps:        steps    ? Number(steps)    : undefined,
      distance:     distance ? Number(distance) : undefined,
      duration:     duration ? Number(duration) : undefined,
      kwhSaved,
      litersSaved,
      billId,
      source: hcAutoFilled ? 'health_connect' : 'manual',
      // Use the selected date (YYYY-MM-DD) so backdated entries land on the right day
      date: toLocalISOString(selectedDate),
    };

    const newActivityData = Object.fromEntries(
      Object.entries(rawData).filter(([, v]) => v !== undefined)
    );

    const tokensEarned = calculateFinalTokens(rawData as any, streak);
    const carbonSaved  = calculateCarbonSaved(rawData as any, userRegion);

    await addDoc(collection(db, 'users', auth.currentUser.uid, 'activities'), newActivityData);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      tokens:           increment(tokensEarned),
      totalCarbonSaved: increment(carbonSaved),
    });

    // Update leaderboard field — uses all activities including the new one
    // (Zustand store will reflect it via Firestore onSnapshot shortly, but
    //  we derive the score locally here to avoid a round-trip delay)
    const updatedActivities = [...activities, { ...newActivityData, id: 'pending' } as any];
    await persistWeeklyEcoScore(
      updatedActivities,
      userProfile?.weeklyTarget ?? 500,
      userRegion,
    );

    if (!celebrated) {
      const weeklyTarget = userProfile?.weeklyTarget ?? 500;
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const currentWeeklyTokens = activities
        .filter((a: any) => new Date(a.date) >= startOfWeek)
        .reduce((sum: number, a: any) => sum + calculateTokens(a), 0);

      if (currentWeeklyTokens + tokensEarned >= weeklyTarget) {
        setCelebrated(false);
      }
    }

    router.back();
  };

  const isSaveDisabled =
    saving || !category ||
    (category === 'walking'     && !steps && !distance) ||
    (category === 'running'     && (!distance || !duration)) ||
    (category === 'cycling'     && !distance) ||
    (category === 'electricity' && !billReading) ||
    (category === 'water'       && !billReading);

  const stepsLocked    = category === 'walking' && distance.length > 0;
  const distanceLocked = category === 'walking' && steps.length > 0;

  const preview = isBillCategory(category) ? previewSaving() : null;

  const handleHCAutoFill = (data: { steps?: number; distance?: number; duration?: number }) => {
    if (data.steps    !== undefined) setSteps(String(data.steps));
    if (data.distance !== undefined) setDistance(String(data.distance));
    if (data.duration !== undefined) setDuration(String(data.duration));
    setHcAutoFilled(true);
  };

  const handleStepsChange    = (v: string) => { setSteps(v);    if (v !== steps)    setHcAutoFilled(false); if (v) setDistance(''); };
  const handleDistanceChange = (v: string) => { setDistance(v); if (v !== distance) setHcAutoFilled(false); if (category === 'walking' && v) setSteps(''); };
  const handleDurationChange = (v: string) => { setDuration(v); if (v !== duration) setHcAutoFilled(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Category selection ── */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Category</ThemedText>
          <View style={styles.grid}>
            {ACTIVITY_CATEGORIES.map(item => {
              const selected = category === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => { setCategory(item.key); resetInputs(); }}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: selected
                        ? (CATEGORY_COLORS[item.key] ?? '#2E7D32') + '22'
                        : colors.surface,
                      borderWidth: selected ? 1 : 0,
                      borderColor: selected
                        ? (CATEGORY_COLORS[item.key] ?? '#2E7D32') + '66'
                        : 'transparent',
                    },
                  ]}
                >
                  <FontAwesome6
                    name={item.icon as any}
                    size={26}
                    color={selected ? (CATEGORY_COLORS[item.key] ?? '#2E7D32') : colors.icon}
                  />
                  <ThemedText
                    style={[
                      styles.categoryLabel,
                      selected && styles.categoryLabelActive,
                      { color: colors.icon },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Date picker — below category so user picks what first, then when ── */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Date</ThemedText>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [
              styles.dateBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.tint + '30',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.tint} />
            <ThemedText style={[styles.dateBtnText, { color: colors.text }]}>
              {formatDisplayDate(selectedDate)}
            </ThemedText>
            <Ionicons name="chevron-down" size={15} color={colors.text + '55'} style={{ marginLeft: 'auto' }} />
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          )}
        </View>

        {/* ── Health Connect banner ── */}
        {(category === 'walking' || category === 'running' || category === 'cycling') && (
          <HealthConnectBanner category={category} onAutoFill={handleHCAutoFill} />
        )}

        {/* ── Walking ── */}
        {category === 'walking' && (
          <>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text, opacity: stepsLocked ? 0.35 : 1 }}>
                Steps
              </ThemedText>
              <TextInput
                value={steps}
                onChangeText={handleStepsChange}
                keyboardType="numeric"
                placeholder="e.g. 4500"
                placeholderTextColor={colors.text + '55'}
                editable={!stepsLocked}
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text },
                  stepsLocked && { opacity: 0.35 },
                ]}
              />
            </View>
            <View style={styles.orDivider}>
              <View style={[styles.orLine, { backgroundColor: colors.surfaceMuted }]} />
              <ThemedText style={[styles.orText, { color: colors.text }]}>or</ThemedText>
              <View style={[styles.orLine, { backgroundColor: colors.surfaceMuted }]} />
            </View>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text, opacity: distanceLocked ? 0.35 : 1 }}>
                Distance (km)
              </ThemedText>
              <TextInput
                value={distance}
                onChangeText={handleDistanceChange}
                keyboardType="numeric"
                placeholder="e.g. 3.2"
                placeholderTextColor={colors.text + '55'}
                editable={!distanceLocked}
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text },
                  distanceLocked && { opacity: 0.35 },
                ]}
              />
            </View>
          </>
        )}

        {/* ── Running ── */}
        {category === 'running' && (
          <>
            <Input label="Distance (km)"      value={distance} setValue={handleDistanceChange} placeholder="e.g. 3.2" colors={colors} />
            <Input label="Duration (minutes)" value={duration} setValue={handleDurationChange} placeholder="e.g. 25"  colors={colors} />
          </>
        )}

        {/* ── Cycling ── */}
        {category === 'cycling' && (
          <Input label="Distance (km)" value={distance} setValue={handleDistanceChange} placeholder="e.g. 5" colors={colors} />
        )}

        {/* ── Bill reading (electricity / water) ── */}
        {isBillCategory(category) && (
          <View style={styles.billSection}>

            <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
              <FontAwesome6
                name={category === 'electricity' ? 'bolt' : 'droplet'}
                size={13}
                color={CATEGORY_COLORS[category]}
              />
              <ThemedText style={[styles.infoText, { color: colors.text }]}>
                {category === 'electricity'
                  ? 'Enter your meter reading or total kWh from your electricity bill this month.'
                  : 'Enter your total water usage in litres from your bill or meter this month.'}
              </ThemedText>
            </View>

            {loadingBill ? (
              <View style={styles.hintRow}>
                <ActivityIndicator size={12} color={colors.tint} />
                <ThemedText style={[styles.hintText, { color: colors.text }]}>Loading your previous reading…</ThemedText>
              </View>
            ) : lastBill ? (
              <View style={styles.hintRow}>
                <FontAwesome6 name="clock-rotate-left" size={11} color={colors.tint} />
                <ThemedText style={[styles.hintText, { color: colors.text }]}>
                  Last reading:{' '}
                  <ThemedText style={{ fontWeight: '700', color: colors.text }}>
                    {lastBill.reading.toLocaleString()}
                    {category === 'electricity' ? ' kWh' : ' L'}
                  </ThemedText>
                  {' · '}
                  {new Date(lastBill.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.hintRow}>
                <FontAwesome6 name="circle-info" size={11} color={colors.text} style={{ opacity: 0.4 }} />
                <ThemedText style={[styles.hintText, { color: colors.text }]}>
                  No previous reading — comparing against your region's avg
                  {' '}(~{getRegionalBaseline(category, userRegion ?? 'GLOBAL_AVG').toLocaleString()}
                  {category === 'electricity' ? ' kWh/month' : ' L/month'})
                </ThemedText>
              </View>
            )}

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                {category === 'electricity' ? 'Meter reading (kWh)' : 'Usage this month (litres)'}
              </ThemedText>
              <View style={styles.inputRow}>
                <TextInput
                  value={billReading}
                  onChangeText={setBillReading}
                  keyboardType="numeric"
                  placeholder={category === 'electricity' ? 'e.g. 320' : 'e.g. 4800'}
                  placeholderTextColor={colors.text + '55'}
                  style={[styles.input, styles.inputFlex, { backgroundColor: colors.surface, color: colors.text }]}
                />
                <Pressable
                  onPress={handleScan}
                  disabled={scanning}
                  style={({ pressed }) => [
                    styles.scanBtn,
                    { backgroundColor: CATEGORY_COLORS[category] + '22', opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  {scanning ? (
                    <ActivityIndicator size={16} color={CATEGORY_COLORS[category]} />
                  ) : (
                    <>
                      <FontAwesome6 name="camera" size={15} color={CATEGORY_COLORS[category]} />
                      <ThemedText style={[styles.scanBtnText, { color: CATEGORY_COLORS[category] }]}>Scan</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {preview !== null && (
              <View style={[
                styles.previewBox,
                { backgroundColor: preview.savedAmount > 0 ? colors.tint + '15' : colors.surfaceMuted },
              ]}>
                <FontAwesome6
                  name={preview.savedAmount > 0 ? 'circle-check' : 'circle-exclamation'}
                  size={13}
                  color={preview.savedAmount > 0 ? colors.tint : colors.text}
                  style={{ opacity: preview.savedAmount > 0 ? 1 : 0.5 }}
                />
                <View style={{ flex: 1 }}>
                  {preview.savedAmount > 0 ? (
                    <>
                      <ThemedText style={[styles.previewMain, { color: colors.tint }]}>
                        {preview.savedAmount.toFixed(1)}
                        {category === 'electricity' ? ' kWh saved' : ' litres saved'}
                      </ThemedText>
                      <ThemedText style={[styles.previewSub, { color: colors.text }]}>
                        {preview.basedOnPrevious
                          ? `vs your previous reading (${lastBill?.reading.toLocaleString()}${category === 'electricity' ? ' kWh' : ' L'})`
                          : 'vs average household usage'}
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText style={[styles.previewSub, { color: colors.text }]}>
                      {preview.basedOnPrevious
                        ? `Usage is higher than your previous reading (${lastBill?.reading.toLocaleString()}${category === 'electricity' ? ' kWh' : ' L'}) — no saving this period.`
                        : 'Usage exceeds the average — no saving detected, but logging helps track trends.'}
                    </ThemedText>
                  )}
                </View>
              </View>
            )}

            {category === 'water' && (
              <ThemedText style={[styles.hintText, { color: colors.text, fontStyle: 'italic', opacity: 0.4 }]}>
                💧 Water savings generate tokens. CO₂ impact is small by nature.
              </ThemedText>
            )}
          </View>
        )}

        {/* ── Save button ── */}
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: colors.tint },
            isSaveDisabled && { opacity: 0.4 },
          ]}
          onPress={handleSave}
          disabled={isSaveDisabled}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Save Activity</ThemedText>
          )}
        </Pressable>

        {/* ── OCR sheets ── */}
        {isBillCategory(category) && (
          <>
            <OCRCandidatePicker
              visible={showPicker}
              type={category}
              candidates={ocrCandidates}
              onSelect={handleOCRSelect}
              onManual={() => setShowPicker(false)}
              onRetry={() => { setShowPicker(false); handleScan(); }}
              onClose={() => setShowPicker(false)}
            />
            <OCRNoResultSheet
              visible={showNoResult}
              allText=""
              onRetry={() => { setShowNoResult(false); handleScan(); }}
              onManual={() => setShowNoResult(false)}
              onClose={() => setShowNoResult(false)}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Input({
  label, value, setValue, placeholder, colors,
}: {
  label: string; value: string; setValue: (v: string) => void;
  placeholder: string; colors: any;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={setValue}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.text + '55'}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { padding: 16, gap: 20, paddingBottom: 40 },
  section:    { gap: 10 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Date picker button — matches edit.tsx style
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, padding: 14, borderRadius: 12, borderWidth: 1.5,
  },
  dateBtnText: { fontSize: 15, flex: 1 },

  categoryCard: {
    width: '48%', paddingVertical: 18, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  categoryLabel:       { fontSize: 14, opacity: 0.8 },
  categoryLabelActive: { fontWeight: '600', opacity: 1 },

  field:     { gap: 6 },
  input:     { padding: 12, borderRadius: 10, fontSize: 16 },
  inputFlex: { flex: 1 },
  inputRow:  { flexDirection: 'row', gap: 10, alignItems: 'center' },

  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: -6 },
  orLine:    { flex: 1, height: 1 },
  orText:    { fontSize: 12, opacity: 0.4, fontWeight: '500' },

  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10,
  },
  scanBtnText: { fontSize: 14, fontWeight: '600' },

  billSection: { gap: 12 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, padding: 12, borderRadius: 10,
  },
  infoText: { fontSize: 13, opacity: 0.7, flex: 1, lineHeight: 18 },

  hintRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  hintText: { fontSize: 12, opacity: 0.55, flex: 1, lineHeight: 16 },

  previewBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, padding: 12, borderRadius: 10,
  },
  previewMain: { fontSize: 16, fontWeight: '700' },
  previewSub:  { fontSize: 12, opacity: 0.6, marginTop: 2 },

  saveButton: {
    marginTop: 8, padding: 16, borderRadius: 14, alignItems: 'center',
  },
});