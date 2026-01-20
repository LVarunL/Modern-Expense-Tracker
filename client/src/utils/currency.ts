const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED ",
};

export function normalizeCurrency(code?: string | null): string {
  if (!code) {
    return "INR";
  }
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length === 3 && /^[A-Z]+$/.test(trimmed)) {
    return trimmed;
  }
  return "INR";
}

export function getCurrencySymbol(code?: string | null): string {
  const normalized = normalizeCurrency(code);
  return SYMBOLS[normalized] ?? `${normalized} `;
}
