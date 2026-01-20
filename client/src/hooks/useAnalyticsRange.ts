import { useMemo, useState } from "react";

import type { AnalyticsBucket } from "../api/types";
import {
  deriveAnalyticsBucket,
  formatRangeLabel,
  resolveAnalyticsRange,
} from "../utils/analyticsRange";
import { validateTimeRange, type TimeRangeFilter } from "../utils/timeRange";
import { getDeviceTimeZone } from "../utils/timezone";

const DEFAULT_RANGE: TimeRangeFilter = {
  preset: "last30",
  customStart: "",
  customEnd: "",
};

export function useAnalyticsRange(initial?: TimeRangeFilter) {
  const [range, setRange] = useState<TimeRangeFilter>(initial ?? DEFAULT_RANGE);
  const error = useMemo(() => validateTimeRange(range), [range]);
  const resolved = useMemo(() => resolveAnalyticsRange(range), [range]);
  const tz = useMemo(() => getDeviceTimeZone(), []);
  const bucket: AnalyticsBucket = useMemo(() => {
    if (!resolved) {
      return "day";
    }
    return deriveAnalyticsBucket(resolved.fromMs, resolved.toMs);
  }, [resolved]);
  const label = useMemo(() => formatRangeLabel(range), [range]);

  return {
    range,
    setRange,
    error,
    resolved,
    bucket,
    label,
    tz,
  };
}
