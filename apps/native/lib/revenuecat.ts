import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

let configuredUserId: string | null = null;

export function getRevenueCatApiKey() {
  return (
    Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      default: "",
    }) ?? ""
  ).trim();
}

export async function configureRevenueCat(appUserId: string) {
  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    configuredUserId = null;
    return null;
  }

  const isConfigured = await Purchases.isConfigured().catch(() => false);

  if (!isConfigured) {
    Purchases.configure({ apiKey, appUserID: appUserId });
    configuredUserId = appUserId;

    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => undefined);
    }

    return true;
  }

  if (configuredUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
    return true;
  }

  return true;
}
