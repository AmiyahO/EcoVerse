// src/services/notificationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centralised notification logic for EcoVerse.
//
// Notification types
//   1. Daily activity reminder  — fires at user-chosen time each day
//   2. Weekly goal alert        — fires at user-chosen time on Sunday
//   3. Streak at-risk nudge     — fires the evening of day 2 with no activity
//   4. "Missed yesterday" nudge — fires on wake if yesterday had no activity
//   5. Weekly summary           — Sunday recap of tokens + CO₂
//
// All scheduling is done with expo-notifications local triggers.
// Firebase Cloud Messaging (remote) is intentionally out of scope here.
// ─────────────────────────────────────────────────────────────────────────────
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Handler (set once at app boot in _layout.tsx) ───────────────────────────
// Note: Android notification appearance (icon, colour) is controlled by the
// app notification icon asset and channel lightColor (set to #4CAF50 in
// requestNotifPermission). Notification titles/bodies are plain text —
// visual identity comes from the channel, not text content.
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  false,
      shouldSetBadge:   false,
    }),
  });
}

// ── Permission ───────────────────────────────────────────────────────────────
export type NotifPermStatus = 'granted' | 'denied' | 'not_asked';

export async function getNotifPermStatus(): Promise<NotifPermStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied')  return 'denied';
  return 'not_asked';
}

/**
 * Request notification permission. Returns final status.
 * On Android 13+ (API 33) this shows the system dialog; earlier versions
 * always return 'granted'.
 */
export async function requestNotifPermission(): Promise<NotifPermStatus> {
  if (Platform.OS === 'android') {
    // Expo SDK 50+ handles the POST_NOTIFICATIONS permission request via
    // Notifications.requestPermissionsAsync().
    await Notifications.setNotificationChannelAsync('ecoverse_default', {
      name:              'EcoVerse',
      importance:        Notifications.AndroidImportance.DEFAULT,
      vibrationPattern:  [0, 250, 250, 250],
      lightColor:        '#4CAF50',
      sound:             null,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

// ── Settings shape ────────────────────────────────────────────────────────────
export interface NotifSettings {
  /** Daily activity reminder enabled */
  dailyReminder:         boolean;
  /** HH:MM string e.g. "19:00" */
  dailyReminderTime:     string;
  /** Weekly goal progress alert (Sunday) */
  weeklyGoalAlert:       boolean;
  /** Time for the Sunday recap ("09:00") */
  weeklyGoalTime:        string;
  /** Fires if user logged nothing yesterday */
  missedDayNudge:        boolean;
  /** Evening nudge if streak is at risk (no activity by 20:00) */
  streakAtRiskAlert:     boolean;
  /** Time for streak-at-risk check ("20:00") */
  streakAtRiskTime:      string;
}

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  dailyReminder:         true,
  dailyReminderTime:     '19:00',
  weeklyGoalAlert:       true,
  weeklyGoalTime:        '09:00',
  missedDayNudge:        true,
  streakAtRiskAlert:     false,
  streakAtRiskTime:      '20:00',
};

// ── Notification identifiers (used to cancel specific ones) ─────────────────
const IDS = {
  DAILY_REMINDER:   'ev_daily_reminder',
  WEEKLY_GOAL:      'ev_weekly_goal',
  STREAK_AT_RISK:   'ev_streak_risk',
  // Missed-day nudge is one-shot, scheduled dynamically
  MISSED_DAY:       'ev_missed_day',
};

// ── Parse "HH:MM" → { hour, minute } ─────────────────────────────────────────
function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h || 19, minute: m || 0 };
}

// ── Cancel helpers ────────────────────────────────────────────────────────────
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// ── Schedule / reschedule all notifications ──────────────────────────────────
/**
 * Call this whenever settings change. Cancels existing repeating notifications
 * and re-schedules them based on current settings.
 */
export async function applyNotifSettings(
  settings: NotifSettings,
  /** Pass the current streak so the "at risk" copy can be personalised */
  currentStreak: number = 0,
) {
  // Cancel all existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const perm = await getNotifPermStatus();
  if (perm !== 'granted') return; // nothing to schedule

  // 1. Daily activity reminder
  if (settings.dailyReminder) {
    const { hour, minute } = parseTime(settings.dailyReminderTime);
    await Notifications.scheduleNotificationAsync({
      identifier: IDS.DAILY_REMINDER,
      content: {
        title: 'Time to log today',
        body:  "Don't let the day slip by — log an eco activity and keep your impact growing.",
        data:  { type: 'daily_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  // 2. Weekly goal recap (Sunday)
  if (settings.weeklyGoalAlert) {
    const { hour, minute } = parseTime(settings.weeklyGoalTime);
    await Notifications.scheduleNotificationAsync({
      identifier: IDS.WEEKLY_GOAL,
      content: {
        title: 'Weekly EcoScore recap',
        body:  "See how your EcoScore shaped up this week. A fresh week starts now — make it count.",
        data:  { type: 'weekly_goal' },
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 1 = Sunday in Expo's trigger (same as JS getDay())
        hour,
        minute,
      },
    });
  }

  // 3. Streak at-risk alert (daily)
  if (settings.streakAtRiskAlert) {
    const { hour, minute } = parseTime(settings.streakAtRiskTime);
    const streakCopy = currentStreak >= 3
      ? `Your ${currentStreak}-day streak is on the line — log before midnight to keep it alive.`
      : 'No activity logged yet today — keep your streak going before midnight.';
    await Notifications.scheduleNotificationAsync({
      identifier: IDS.STREAK_AT_RISK,
      content: {
        title: 'Streak at risk',
        body:  streakCopy,
        data:  { type: 'streak_at_risk' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

// ── Missed-yesterday nudge ────────────────────────────────────────────────────
/**
 * Called on app foreground (or boot). Checks if yesterday had no activity;
 * if so, schedules a one-shot notification 30 seconds from now.
 * If yesterday had activity, cancels any existing missed-day notification.
 *
 * @param activityDates - array of 'YYYY-MM-DD' strings from the activity store
 */
export async function checkAndScheduleMissedDayNudge(
  activityDates: string[],
  nudgeEnabled: boolean,
) {
  await Notifications.cancelScheduledNotificationAsync(IDS.MISSED_DAY);

  if (!nudgeEnabled) return;
  const perm = await getNotifPermStatus();
  if (perm !== 'granted') return;

  const now       = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const ymd = yesterday.toISOString().slice(0, 10);

  const loggedYesterday = activityDates.some(d => d.startsWith(ymd));
  if (loggedYesterday) return; // nothing to nudge

  // Fire 30 seconds from now (so it appears shortly after the app opens,
  // not instantly — gives the UI time to settle)
  const fireAt = new Date(now.getTime() + 30_000);
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.MISSED_DAY,
    content: {
      title: 'You missed yesterday',
      body:  "You can still log yesterday's activities — just use the date picker when adding a new entry.",
      data:  { type: 'missed_day' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

// ── One-shot: celebrate goal reached ─────────────────────────────────────────
/**
 * Call when the user crosses their weekly token target. Fires a one-shot
 * notification immediately (in case they're not in the app).
 */
export async function sendGoalReachedNotification(weeklyTarget: number) {
  const perm = await getNotifPermStatus();
  if (perm !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'ev_goal_reached',
    content: {
      title: 'Weekly goal reached!',
      body:  `You hit ${weeklyTarget} EcoTokens this week — brilliant work. Keep the momentum going.`,
      data:  { type: 'goal_reached' },
    },
    trigger: null, // fire immediately
  });
}
// ── Missed challenge notification ────────────────────────────────────────────
/**
 * Called on the first app open of a new week when the user had joined-but-
 * incomplete challenges in the previous week.
 * Fires a single one-shot notification immediately (or within 5 seconds).
 */
export async function sendMissedChallengeNotification(missedCount: number) {
  const perm = await getNotifPermStatus();
  if (perm !== 'granted') return;

  const body = missedCount === 1
    ? "One challenge didn't complete last week. New challenges are live — jump back in."
    : `${missedCount} challenges didn't complete last week. Fresh ones are waiting — go claim them.`;

  await Notifications.scheduleNotificationAsync({
    identifier: 'ev_missed_challenge',
    content: {
      title: "Last week's challenges expired",
      body,
      data: { type: 'missed_challenge' },
    },
    trigger: null, // fire immediately
  });
}