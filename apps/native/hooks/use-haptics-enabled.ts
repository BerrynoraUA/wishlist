import { PREFERENCE_KEYS, preferencesStorage } from "@/lib/storage";
import { useMMKVBoolean } from "react-native-mmkv";

export function useHapticsEnabled(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useMMKVBoolean(PREFERENCE_KEYS.hapticsEnabled, preferencesStorage);
  return [enabled ?? true, setEnabled];
}
