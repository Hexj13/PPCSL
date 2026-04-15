export function selectRegistryItemsForRunReport<T extends { updatedAt: string }>(
  items: T[],
  startedAtIso: string,
): T[] {
  return items.filter((item) => item.updatedAt >= startedAtIso);
}
