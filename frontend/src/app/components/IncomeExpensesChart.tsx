"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyData = {
  month: string;
  income: number;
  expenses: number;
};

type IncomeExpensesChartProps = {
  months: MonthlyData[];
  currency: string;
};

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");

  const date = new Date(
    Date.UTC(Number(year), Number(monthNumber) - 1, 1),
  );

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
    }).format(date);
}

export default function IncomeExpensesChart({
  months,
  currency,
}: IncomeExpensesChartProps) {
  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "PYG" ? 0 : 2,
    }).format(value);
  }

  function formatAxisValue(value: number) {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(
        value % 1_000_000 === 0 ? 0 : 1,
      )}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(
        value % 1_000 === 0 ? 0 : 1,
      )}K`;
    }

    return String(value);
  }

  const data = months.map((item) => ({
    ...item,
    label: formatMonth(item.month),
  }));

  const hasData = months.some(
    (item) => item.income > 0 || item.expenses > 0,
  );

  if (!hasData) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="text-center">
          <p className="font-medium">No financial activity yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Income and expenses will appear here as you add transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            opacity={0.25}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 12,
            }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 12,
            }}
            tickFormatter={formatAxisValue}
            width={45}
          />

          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value)),
              name === "income" ? "Income" : "Expenses",
            ]}
            labelFormatter={(label) => `Month: ${label}`}
          />

          <Legend
            formatter={(value) =>
              value === "income" ? "Income" : "Expenses"
            }
          />

          <Bar
            dataKey="income"
            fill="var(--success)"
            radius={[6, 6, 0, 0]}
            maxBarSize={42}
          />

          <Bar
            dataKey="expenses"
            fill="var(--danger)"
            radius={[6, 6, 0, 0]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}