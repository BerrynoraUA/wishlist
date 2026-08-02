export const NAV_TAB_BAR_HEIGHT = 58;
export const NAV_TAB_BAR_BACKDROP_OFFSET = 4;

export function chunkRows<T>(items: readonly T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}
