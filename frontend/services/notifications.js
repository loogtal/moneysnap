import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = "moneysnap_default";
const WEEKLY_TAG = "weekly_reminder";

async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "MoneySnap",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: true,
    }).catch(() => {});
  }
}

export async function requestPermission() {
  await setupAndroidChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function sendScanSuccess(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
    },
    trigger: null,
  }).catch(() => {});
}

export async function scheduleWeeklyReminder(title, body) {
  await cancelWeeklyReminder();
  try {
    const TriggerTypes = Notifications.SchedulableTriggerInputTypes;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { notifType: WEEKLY_TAG },
        ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
      },
      trigger: {
        type: TriggerTypes?.WEEKLY ?? "weekly",
        weekday: 2,
        hour: 9,
        minute: 0,
      },
    });
  } catch {
    // Fallback: 7-day repeating interval
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { notifType: WEEKLY_TAG },
        ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
      },
      trigger: { seconds: 60 * 60 * 24 * 7, repeats: true },
    }).catch(() => {});
  }
}

export async function cancelWeeklyReminder() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content.data?.notifType === WEEKLY_TAG)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {}
}
