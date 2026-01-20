export type TimeRangePreset =
  | "all"
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export type TimeRangeFilter = {
  preset: TimeRangePreset;
  customStart: string;
  customEnd: string;
};

export type BuiltTimeRange = {
  fromMs?: number;
  toMs?: number;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfNextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateTimeRange(filter: TimeRangeFilter): string | null {
  if (filter.preset !== "custom") {
    return null;
  }
  const hasStart = Boolean(filter.customStart.trim());
  const hasEnd = Boolean(filter.customEnd.trim());
  if (!hasStart && !hasEnd) {
    return "Enter a start and end date.";
  }
  if (!hasStart || !hasEnd) {
    return "Both start and end dates are required.";
  }
  const start = parseDateInput(filter.customStart);
  const end = parseDateInput(filter.customEnd);
  if (!start || !end) {
    return "Use YYYY-MM-DD for custom dates.";
  }
  const startMs = startOfDay(start).getTime();
  const endMs = startOfNextDay(end).getTime();
  if (startMs >= endMs) {
    return "Start date must be before end date.";
  }
  return null;
}

export function isTimeRangeActive(filter: TimeRangeFilter): boolean {
  return filter.preset !== "all";
}

export function buildTimeRange(
  filter: TimeRangeFilter,
  now = new Date()
): BuiltTimeRange {
  const todayStart = startOfDay(now);
  const tomorrowStart = startOfNextDay(now);

  switch (filter.preset) {
    case "today":
      return { fromMs: todayStart.getTime(), toMs: tomorrowStart.getTime() };
    case "last7": {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { fromMs: start.getTime(), toMs: tomorrowStart.getTime() };
    }
    case "last30": {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { fromMs: start.getTime(), toMs: tomorrowStart.getTime() };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { fromMs: start.getTime(), toMs: end.getTime() };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromMs: start.getTime(), toMs: end.getTime() };
    }
    case "custom": {
      const start = parseDateInput(filter.customStart);
      const end = parseDateInput(filter.customEnd);
      if (!start || !end) {
        return {};
      }
      return {
        fromMs: startOfDay(start).getTime(),
        toMs: startOfNextDay(end).getTime(),
      };
    }
    default:
      return {};
  }
}
