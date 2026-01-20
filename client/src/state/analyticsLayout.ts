import AsyncStorage from "@react-native-async-storage/async-storage";

export type AnalyticsCardId = "trend" | "categories" | "types" | "cashflow";

export type AnalyticsLayout = {
  order: AnalyticsCardId[];
  hidden: AnalyticsCardId[];
};

const STORAGE_KEY = "analytics.layout.v1";

export const DEFAULT_ANALYTICS_ORDER: AnalyticsCardId[] = [
  "trend",
  "categories",
  "types",
  "cashflow",
];

export const DEFAULT_ANALYTICS_LAYOUT: AnalyticsLayout = {
  order: DEFAULT_ANALYTICS_ORDER,
  hidden: [],
};

function normalizeLayout(
  layout: AnalyticsLayout,
  available: AnalyticsCardId[]
): AnalyticsLayout {
  const availableSet = new Set(available);
  const order = layout.order.filter((id) => availableSet.has(id));
  for (const id of available) {
    if (!order.includes(id)) {
      order.push(id);
    }
  }
  const hidden = layout.hidden.filter((id) => availableSet.has(id));
  return {
    order,
    hidden: Array.from(new Set(hidden)),
  };
}

export async function loadAnalyticsLayout(
  available: AnalyticsCardId[]
): Promise<AnalyticsLayout> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return normalizeLayout(DEFAULT_ANALYTICS_LAYOUT, available);
    }
    const parsed = JSON.parse(raw) as AnalyticsLayout;
    if (!parsed?.order || !parsed?.hidden) {
      return normalizeLayout(DEFAULT_ANALYTICS_LAYOUT, available);
    }
    return normalizeLayout(parsed, available);
  } catch {
    return normalizeLayout(DEFAULT_ANALYTICS_LAYOUT, available);
  }
}

export async function saveAnalyticsLayout(
  layout: AnalyticsLayout
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}
