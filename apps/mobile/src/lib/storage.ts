import { createMMKV } from "react-native-mmkv";

/**
 * Shared MMKV storage instance for the app.
 * Use this instance throughout the app for persistent storage.
 *
 * @example
 * ```ts
 * import { storage } from '@/lib/storage';
 *
 * // Store a value
 * storage.set('key', 'value');
 *
 * // Retrieve a value
 * const value = storage.getString('key');
 * ```
 */
export const storage = createMMKV({ id: "app-storage" });
