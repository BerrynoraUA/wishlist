import { initializeGT } from "gt-react-native";
import gtConfig from "../gt.config.json";
import { loadTranslations } from "../loadTranslations";

// Initialize after the Intl polyfills and before Expo Router loads any routes.
initializeGT({
  ...gtConfig,
  devApiKey: process.env.EXPO_PUBLIC_GT_DEV_API_KEY,
  projectId: process.env.EXPO_PUBLIC_GT_PROJECT_ID,
  loadTranslations,
});
