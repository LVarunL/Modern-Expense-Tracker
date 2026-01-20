export type EpochLike = number | string | null | undefined;

export function normalizeEpochMs(value: EpochLike): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return value < 1_000_000_000_000
      ? Math.round(value * 1000)
      : Math.round(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric < 1_000_000_000_000
      ? Math.round(numeric * 1000)
      : Math.round(numeric);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
}
