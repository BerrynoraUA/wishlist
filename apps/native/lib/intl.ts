const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();

/**
 * A shared `Intl.DateTimeFormat` for `locale` and `options`, built once.
 *
 * Constructing one is slow on Hermes — the first of a session costs tens of milliseconds
 * on Android — so formatting in render (list rows especially) must not build a new one
 * each time. `toLocaleDateString` builds one internally on every call, so use this instead.
 */
export function getDateTimeFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let format = dateTimeFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    dateTimeFormats.set(key, format);
  }
  return format;
}
