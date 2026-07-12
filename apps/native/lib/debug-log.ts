export function debugLog(message: string) {
  if (__DEV__) console.log(message);
}

export function debugError(message: string, error?: unknown) {
  if (__DEV__) console.error(message, error);
}
