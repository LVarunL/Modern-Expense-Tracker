import {
  buildBarPoints,
  buildCashflowBars,
  buildDonutSegments,
  buildLineSeriesData,
  splitCategoryTotals,
  splitTypeTotals,
  totalByDirection,
} from "../analyticsChartTransforms";

describe("analyticsChartTransforms", () => {
  it("builds sorted line series data", () => {
    const series = [
      { bucket_start: 2000, total: 20, transaction_count: 1 },
      { bucket_start: 1000, total: 10, transaction_count: 2 },
    ];

    expect(buildLineSeriesData(series)).toMatchInlineSnapshot(`
[
  {
    "x": 1000,
    "y": 10,
  },
  {
    "x": 2000,
    "y": 20,
  },
]
`);
  });

  it("splits and sorts categories by direction", () => {
    const categories = [
      {
        category: "Travel",
        direction: "outflow",
        total: 50,
        transaction_count: 1,
      },
      {
        category: "Food",
        direction: "outflow",
        total: 120,
        transaction_count: 2,
      },
      {
        category: "Income",
        direction: "inflow",
        total: 250,
        transaction_count: 1,
      },
      {
        category: "Bonus",
        direction: "inflow",
        total: 100,
        transaction_count: 1,
      },
    ];

    expect(splitCategoryTotals(categories)).toMatchInlineSnapshot(`
{
  "inflow": [
    {
      "category": "Income",
      "direction": "inflow",
      "total": 250,
      "transaction_count": 1,
    },
    {
      "category": "Bonus",
      "direction": "inflow",
      "total": 100,
      "transaction_count": 1,
    },
  ],
  "outflow": [
    {
      "category": "Food",
      "direction": "outflow",
      "total": 120,
      "transaction_count": 2,
    },
    {
      "category": "Travel",
      "direction": "outflow",
      "total": 50,
      "transaction_count": 1,
    },
  ],
}
`);
  });

  it("splits and sorts types by direction", () => {
    const types = [
      {
        type: "expense",
        direction: "outflow",
        total: 80,
        transaction_count: 1,
      },
      {
        type: "transfer",
        direction: "outflow",
        total: 40,
        transaction_count: 1,
      },
      {
        type: "income",
        direction: "inflow",
        total: 200,
        transaction_count: 2,
      },
    ];

    expect(splitTypeTotals(types)).toMatchInlineSnapshot(`
{
  "inflow": [
    {
      "direction": "inflow",
      "total": 200,
      "transaction_count": 2,
      "type": "income",
    },
  ],
  "outflow": [
    {
      "direction": "outflow",
      "total": 80,
      "transaction_count": 1,
      "type": "expense",
    },
    {
      "direction": "outflow",
      "total": 40,
      "transaction_count": 1,
      "type": "transfer",
    },
  ],
}
`);
  });

  it("builds donut segments with an other bucket", () => {
    const categories = [
      {
        category: "Food",
        direction: "outflow",
        total: 60,
        transaction_count: 2,
      },
      {
        category: "Travel",
        direction: "outflow",
        total: 30,
        transaction_count: 1,
      },
      {
        category: "Bills",
        direction: "outflow",
        total: 10,
        transaction_count: 1,
      },
    ];

    expect(buildDonutSegments(categories, ["#111111", "#222222", "#333333"], 2))
      .toMatchInlineSnapshot(`
{
  "segments": [
    {
      "color": "#111111",
      "label": "Food",
      "value": 60,
    },
    {
      "color": "#222222",
      "label": "Travel",
      "value": 30,
    },
    {
      "color": "#333333",
      "label": "Other",
      "value": 10,
    },
  ],
  "total": 100,
}
`);
  });

  it("builds cashflow bars and totals by direction", () => {
    const summary = {
      total_inflow: 500,
      total_outflow: 200,
      net: 300,
      transaction_count: 3,
    };

    expect(
      buildCashflowBars(summary, { inflow: "#00FF00", outflow: "#FF0000" })
    ).toMatchInlineSnapshot(`
[
  {
    "color": "#00FF00",
    "label": "Inflow",
    "value": 500,
  },
  {
    "color": "#FF0000",
    "label": "Outflow",
    "value": 200,
  },
]
`);

    expect(totalByDirection(summary, "inflow")).toBe(500);
    expect(totalByDirection(summary, "outflow")).toBe(200);
  });

  it("builds bar points with repeating palettes", () => {
    const items = [{ total: 10 }, { total: 20 }, { total: 30 }];
    expect(buildBarPoints(items, ["#111111", "#222222"]))
      .toMatchInlineSnapshot(`
[
  {
    "color": "#111111",
    "value": 10,
  },
  {
    "color": "#222222",
    "value": 20,
  },
  {
    "color": "#111111",
    "value": 30,
  },
]
`);
  });
});
