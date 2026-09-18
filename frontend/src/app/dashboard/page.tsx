"use client";

import { API_URL } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "../components/AppHeader";
import AppShell from "../components/AppShell";
import ExpensesByCategoryChart from "../components/ExpensesByCategoryChart";
import IncomeExpensesChart from "../components/IncomeExpensesChart";

type User = {
  id: string;
  name: string;
  email: string;
  currency: string;
};

type Transaction = {
  id: string;
  amount: string;
  description: string | null;
  type: "INCOME" | "EXPENSE";
  date: string;
  category: {
    id: string;
    name: string;
  };
};

type DashboardSummary = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentTransactions: Transaction[];
};

type CategoryExpense = {
  categoryId: string;
  categoryName: string;
  total: number;
};

type DashboardCategories = {
  categories: CategoryExpense[];
};

type MonthlyData = {
  month: string;
  income: number;
  expenses: number;
};

type DashboardMonthly = {
  months: MonthlyData[];
};

type DashboardData = {
  user: User;
  summary: DashboardSummary;
  categories: CategoryExpense[];
  months: MonthlyData[];
};

async function fetchDashboardData(
  token: string,
): Promise<DashboardData> {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const [
    userResponse,
    summaryResponse,
    categoriesResponse,
    monthlyResponse,
  ] = await Promise.all([
    fetch(`${API_URL}/auth/me`, { headers }),
    fetch(`${API_URL}/dashboard/summary`, { headers }),
    fetch(`${API_URL}/dashboard/categories`, { headers }),
    fetch(`${API_URL}/dashboard/monthly`, { headers }),
  ]);

  const responses = [
    userResponse,
    summaryResponse,
    categoriesResponse,
    monthlyResponse,
  ];

  if (responses.some((response) => response.status === 401)) {
    throw new Error("UNAUTHORIZED");
  }

  if (responses.some((response) => !response.ok)) {
    throw new Error("SERVER_ERROR");
  }

  const userData = await userResponse.json();

  const summaryData: DashboardSummary =
    await summaryResponse.json();

  const categoriesData: DashboardCategories =
    await categoriesResponse.json();

  const monthlyData: DashboardMonthly =
    await monthlyResponse.json();

  return {
    user: userData.user,
    summary: summaryData,
    categories: categoriesData.categories,
    months: monthlyData.months,
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);
  const [categories, setCategories] =
    useState<CategoryExpense[]>([]);
  const [months, setMonths] =
    useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlowLoadingMessage, setShowSlowLoadingMessage] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadInitialDashboard() {
      try {
        const data = await fetchDashboardData(token!);

        setUser(data.user);
        setSummary(data.summary);
        setCategories(data.categories);
        setMonths(data.months);
      } catch (loadError) {
        if (
          loadError instanceof Error &&
          loadError.message === "UNAUTHORIZED"
        ) {
          localStorage.removeItem("noniq_token");
          router.replace("/login");
          return;
        }

        setError(
          "We couldn't load your dashboard. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInitialDashboard();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSlowLoadingMessage(true);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  async function retryDashboard() {
    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setShowSlowLoadingMessage(false);
    setError(null);

    try {
      const data = await fetchDashboardData(token);

      setUser(data.user);
      setSummary(data.summary);
      setCategories(data.categories);
      setMonths(data.months);
    } catch (loadError) {
      if (
        loadError instanceof Error &&
        loadError.message === "UNAUTHORIZED"
      ) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      setError(
        "We couldn't load your dashboard. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value: number) {
    if (!user) {
      return "";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: user.currency,
      maximumFractionDigits:
        user.currency === "PYG" ? 0 : 2,
    }).format(value);
  }

  if (loading) {
    return (
      <AppShell>
        <AppHeader />

        <section className="mt-16" aria-busy="true" aria-live="polite">
          <div className="h-4 w-20 animate-pulse rounded-full bg-border" />
          <div className="mt-4 h-10 w-56 max-w-full animate-pulse rounded-xl bg-border" />
          <div className="mt-4 h-5 w-72 max-w-full animate-pulse rounded-lg bg-border" />

          {showSlowLoadingMessage && (
            <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-sm font-medium">Waking up your workspace...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Noniq&apos;s free hosting may need a few extra seconds after a
                period of inactivity.
              </p>
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={index}
              className="min-w-0 rounded-2xl border border-border bg-surface p-6"
            >
              <div className="h-4 w-24 animate-pulse rounded-full bg-border" />
              <div className="mt-4 h-9 w-36 max-w-full animate-pulse rounded-xl bg-border" />
            </article>
          ))}
        </section>

        <section className="mt-10">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-border" />
          <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-full bg-border" />
          <div className="mt-4 h-72 animate-pulse rounded-2xl border border-border bg-surface" />
        </section>

        <section className="mt-10">
          <div className="h-6 w-44 animate-pulse rounded-lg bg-border" />
          <div className="mt-2 h-4 w-56 max-w-full animate-pulse rounded-full bg-border" />
          <div className="mt-4 h-72 animate-pulse rounded-2xl border border-border bg-surface" />
        </section>

        <section className="mt-10 pb-8">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-border" />
          <div className="mt-2 h-4 w-56 max-w-full animate-pulse rounded-full bg-border" />
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 border-b border-border px-6 py-5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-40 max-w-full animate-pulse rounded-full bg-border" />
                  <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-border" />
                </div>
                <div className="h-5 w-24 animate-pulse rounded-full bg-border" />
              </div>
            ))}
          </div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <p className="text-sm font-medium text-muted-foreground">
            SOMETHING WENT WRONG
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            We couldn&apos;t load your dashboard.
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void retryDashboard()}
            className="mt-6 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!user || !summary) {
    return null;
  }

  return (
    <AppShell>
      <AppHeader />

      <section className="mt-16">
        <p className="text-sm font-medium text-muted-foreground">
          OVERVIEW
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
          Hi, {user.name}.
        </h1>

        <p className="mt-3 text-muted-foreground">
          Here&apos;s what&apos;s happening with your money.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="min-w-0 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted-foreground">
            Balance
          </p>

          <p className="mt-3 break-words text-3xl font-semibold tracking-tight">
            {formatMoney(summary.balance)}
          </p>
        </article>

        <article className="min-w-0 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted-foreground">
            Total income
          </p>

          <p className="mt-3 break-words text-3xl font-semibold tracking-tight">
            {formatMoney(summary.totalIncome)}
          </p>
        </article>

        <article className="min-w-0 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted-foreground">
            Income this month
          </p>

          <p className="mt-3 break-words text-3xl font-semibold tracking-tight text-success">
            {formatMoney(summary.monthlyIncome)}
          </p>
        </article>

        <article className="min-w-0 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted-foreground">
            Expenses this month
          </p>

          <p className="mt-3 break-words text-3xl font-semibold tracking-tight text-danger">
            {formatMoney(summary.monthlyExpenses)}
          </p>
        </article>
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Income vs expenses
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Compare your financial activity over the last six months.
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-6">
          <IncomeExpensesChart
            months={months}
            currency={user.currency}
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Expenses by category
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            See where your money is going.
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-6">
          <ExpensesByCategoryChart
            categories={categories}
            currency={user.currency}
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">
              Recent transactions
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your latest financial activity.
            </p>
          </div>

          <Link
            href="/transactions"
            className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {summary.recentTransactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">
                No transactions yet
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Your latest transactions will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {summary.recentTransactions.map(
                (transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 px-6 py-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {transaction.description ||
                          transaction.category.name}
                      </p>

                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {transaction.category.name}
                      </p>
                    </div>

                    <p
                      className={`shrink-0 text-right font-semibold ${
                        transaction.type === "INCOME"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {transaction.type === "INCOME"
                        ? "+"
                        : "-"}
                      {formatMoney(
                        Number(transaction.amount),
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}