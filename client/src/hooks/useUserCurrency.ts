import { useMemo } from "react";

import { useAuth } from "../state/auth";
import { normalizeCurrency } from "../utils/currency";

export function useUserCurrency(): string {
  const { user } = useAuth();
  return useMemo(() => normalizeCurrency(user?.currency), [user?.currency]);
}
