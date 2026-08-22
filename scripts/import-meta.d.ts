/**
 * `import.meta.main` is available on the Node versions the harness runs on, but the
 * pinned `@types/node` (20.x) only declares `dirname` and `filename`. Drop this file when
 * that dependency reaches 22 or later, which ships the declaration itself.
 */
interface ImportMeta {
  readonly main: boolean;
}
