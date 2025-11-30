import { ChangeEvent, NormalizedItem } from "./types";

export function computeChangeSet(previous: NormalizedItem[], next: NormalizedItem[]): ChangeEvent[] {
  const previousById = new Map(previous.map((item) => [item.externalId, item]));
  const changes: ChangeEvent[] = [];
  const now = new Date();

  for (const item of next) {
    const previousItem = previousById.get(item.externalId);

    if (!previousItem) {
      changes.push({
        sourceId: item.sourceId,
        externalId: item.externalId,
        type: "added",
        detectedAt: now,
        current: item,
      });
      continue;
    }

    if (previousItem.fingerprint !== item.fingerprint) {
      changes.push({
        sourceId: item.sourceId,
        externalId: item.externalId,
        type: "updated",
        detectedAt: now,
        previous: previousItem,
        current: item,
      });
    }

    previousById.delete(item.externalId);
  }

  for (const [, previousItem] of previousById) {
    changes.push({
      sourceId: previousItem.sourceId,
      externalId: previousItem.externalId,
      type: "removed",
      detectedAt: now,
      previous: previousItem,
      current: undefined,
    });
  }

  return changes.sort((a, b) => a.externalId.localeCompare(b.externalId));
}
