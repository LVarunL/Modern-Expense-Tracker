import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { TransactionDirection, TransactionType } from "../api/types";

export type FeedFilters = {
  direction: TransactionDirection | null;
  types: TransactionType[];
  categories: string[];
  minAmount: string;
  maxAmount: string;
};

type FeedFiltersContextValue = {
  filters: FeedFilters;
  setFilters: (filters: FeedFilters) => void;
  resetFilters: () => void;
  isLoaded: boolean;
};

const STORAGE_KEY = "feed_filters_v1";

const defaultFilters: FeedFilters = {
  direction: null,
  types: [],
  categories: [],
  minAmount: "",
  maxAmount: "",
};

const FeedFiltersContext = createContext<FeedFiltersContextValue | null>(null);

export function FeedFiltersProvider({ children }: PropsWithChildren) {
  const [filters, setFiltersState] = useState<FeedFilters>(defaultFilters);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored) as Partial<FeedFilters>;
          setFiltersState({ ...defaultFilters, ...parsed });
        }
      } catch {
        setFiltersState(defaultFilters);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    const save = async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    };
    void save();
  }, [filters, isLoaded]);

  const value = useMemo(
    () => ({
      filters,
      setFilters: setFiltersState,
      resetFilters: () => setFiltersState(defaultFilters),
      isLoaded,
    }),
    [filters, isLoaded]
  );

  return (
    <FeedFiltersContext.Provider value={value}>
      {children}
    </FeedFiltersContext.Provider>
  );
}

export function useFeedFilters(): FeedFiltersContextValue {
  const context = useContext(FeedFiltersContext);
  if (!context) {
    throw new Error("useFeedFilters must be used within FeedFiltersProvider");
  }
  return context;
}
