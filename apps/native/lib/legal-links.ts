import * as WebBrowser from "expo-web-browser";

const WEB_APP_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://wishlane.net").replace(/\/$/, "");

// Pages served by the web app's (legal) route group.
export type LegalPage = "terms-of-service" | "privacy-policy" | "refund-policy";

export function openLegalPage(page: LegalPage) {
  return WebBrowser.openBrowserAsync(`${WEB_APP_URL}/${page}`);
}
