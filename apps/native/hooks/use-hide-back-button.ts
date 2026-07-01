import { PREFERENCE_KEYS, preferencesStorage } from "@/lib/storage";
import { useMMKVBoolean } from "react-native-mmkv";

/**
 * Reactive accessor for the "Hide back button" preference.
 *
 * The value is persisted on-device with MMKV and stays in sync across every
 * component using this hook. Defaults to `false` (button visible) when unset.
 */
export function useHideBackButton(): [boolean, (value: boolean) => void] {
  const [hidden, setHidden] = useMMKVBoolean(PREFERENCE_KEYS.hideBackButton, preferencesStorage);

  return [hidden ?? false, setHidden];
}
