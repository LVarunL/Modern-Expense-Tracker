export const mockParsedTransactions = [
  {
    id: "t1",
    title: "Dinner",
    subtitle: "Food & Drinks • Dining",
    amount: "-₹600",
  },
  {
    id: "t2",
    title: "Dessert",
    subtitle: "Food & Drinks • Dessert",
    amount: "-₹200",
  },
  {
    id: "t3",
    title: "Movie",
    subtitle: "Entertainment • Movies",
    amount: "-₹350",
  },
];

export const mockFeed = [
  {
    id: "f1",
    title: "Groceries",
    subtitle: "Groceries • Big Basket",
    amount: "-₹1,280",
    date: "Today, 6:30 PM",
  },
  {
    id: "f2",
    title: "Metro",
    subtitle: "Transport • Metro Card",
    amount: "-₹120",
    date: "Yesterday, 9:10 AM",
  },
  {
    id: "f3",
    title: "Salary",
    subtitle: "Income • ACME Corp",
    amount: "+₹52,000",
    date: "Sep 01, 9:00 AM",
    inflow: true,
  },
];

export const mockSummary = {
  month: "September 2025",
  inflow: "₹52,000",
  outflow: "₹7,340",
  net: "₹44,660",
  categories: [
    { id: "c1", label: "Food & Drinks", value: "₹2,950" },
    { id: "c2", label: "Transport", value: "₹820" },
    { id: "c3", label: "Shopping", value: "₹1,540" },
    { id: "c4", label: "Subscriptions", value: "₹690" },
  ],
};
