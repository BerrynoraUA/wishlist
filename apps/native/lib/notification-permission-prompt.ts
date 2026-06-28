import * as SecureStore from "expo-secure-store";

const NOTIFICATION_PROMPT_KEY_PREFIX = "wishlane.notification-prompt.v2.";
export type NotificationPermissionPromptDecision = "allowed" | "skipped";

function getPromptKey(userId: string) {
  return `${NOTIFICATION_PROMPT_KEY_PREFIX}${userId}`;
}

export async function getNotificationPermissionPromptDecision(
  userId: string,
): Promise<NotificationPermissionPromptDecision | null> {
  const value = await SecureStore.getItemAsync(getPromptKey(userId));
  return value === "allowed" || value === "skipped" ? value : null;
}

export async function setNotificationPermissionPromptDecision(
  userId: string,
  decision: NotificationPermissionPromptDecision,
) {
  await SecureStore.setItemAsync(getPromptKey(userId), decision);
}
