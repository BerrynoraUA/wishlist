import { CryptoDigestAlgorithm, digest, getRandomValues } from "expo-crypto";
import { Platform } from "react-native";

// Supply only the WebCrypto methods needed by Supabase PKCE on native.
// Browsers keep their own implementation (Expo Crypto delegates to it on web).
if (Platform.OS !== "web") {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
  }

  if (!globalThis.crypto.getRandomValues) {
    Object.defineProperty(globalThis.crypto, "getRandomValues", { value: getRandomValues });
  }

  if (!globalThis.crypto.subtle) {
    Object.defineProperty(globalThis.crypto, "subtle", {
      value: {
        digest(algorithm: AlgorithmIdentifier, data: BufferSource) {
          const name = typeof algorithm === "string" ? algorithm : algorithm.name;
          return digest(name.toUpperCase() as CryptoDigestAlgorithm, data);
        },
      },
    });
  }
}
