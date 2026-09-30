import { Keyboard, TextInput } from "react-native";

export function resetFilters(onReset: () => void) {
  // Clear before blurring so iOS cannot commit the input's old text over the reset.
  const input = TextInput.State.currentlyFocusedInput() as TextInput | null;
  input?.clear();
  Keyboard.dismiss();
  onReset();
}
