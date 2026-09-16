"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type CategoryExpense = {
  categoryId: string;
  categoryName: string;
  total: number;
};

type ExpensesByCategoryChartProps = {
  categories: CategoryExpense[];
  currency: string;
};

const CHART_COLORS = [
  "#18181b",
  "#71717a",
  "#a1a1aa",
  "#d4d4d8",
  "#52525b",
  "#27272a",
];

export default function ExpensesByCategoryChart({
  categories,
  currency,
}: ExpensesByCategoryChartProps) {
  const totalExpenses = categories.reduce(
    (sum, category) => sum + category.total,
    0,
  );

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (categories.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No expense data yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid items-center gap-8 md:grid-cols-[1fr_220px]">
      <div className="relative h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories}
              dataKey="total"
              nameKey="categoryName"
              cx="50%"
              cy="50%"
              innerRadius={82}
              outerRadius={120}
              paddingAngle={3}
              stroke="none"
            >
              {categories.map((category, index) => (
                <Cell
                  key={category.categoryId}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) =>
                formatMoney(Number(value))
              }
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm text-muted-foreground">
            Expenses
          </span>

          <span className="mt-1 text-xl font-semibold">
            {formatMoney(totalExpenses)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => {
          const percentage =
            totalExpenses > 0
              ? (category.total / totalExpenses) * 100
              : 0;

          return (
            <div
              key={category.categoryId}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />

                <span className="truncate text-sm">
                  {category.categoryName}
                </span>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium">
                  {percentage.toFixed(0)}%
                </p>

                <p className="text-xs text-muted-foreground">
                  {formatMoney(category.total)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}