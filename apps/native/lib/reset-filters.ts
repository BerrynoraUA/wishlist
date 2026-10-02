import type { TextInput } from "react-native";

export function resetFilters(
  onReset: () => void,
  inputs: readonly (Pick<TextInput, "isFocused" | "clear" | "blur"> | null)[],
) {
  // Clear before blurring so iOS cannot commit the input's old text over the reset.
  const input = inputs.find((candidate) => candidate?.isFocused());
  input?.clear();
  input?.blur();
  onReset();
}
