"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "../components/AppHeader";

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

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem("noniq_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [userResponse, summaryResponse] = await Promise.all([
          fetch("http://localhost:4000/auth/me", {
            headers,
          }),
          fetch("http://localhost:4000/dashboard/summary", {
            headers,
          }),
        ]);

        if (!userResponse.ok || !summaryResponse.ok) {
          localStorage.removeItem("noniq_token");
          router.replace("/login");
          return;
        }

        const userData = await userResponse.json();
        const summaryData = await summaryResponse.json();

        setUser(userData.user);
        setSummary(summaryData);
      } catch {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  function formatMoney(value: number) {
    if (!user) {
      return "";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: user.currency,
      maximumFractionDigits: user.currency === "PYG" ? 0 : 2,
    }).format(value);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading Noniq...</p>
      </main>
    );
  }

  if (!user || !summary) {
    return null;
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <AppHeader user={user} />

        <section className="mt-16">
          <p className="text-sm font-medium text-muted-foreground">OVERVIEW</p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
            Hi, {user.name}.
          </h1>

          <p className="mt-3 text-muted-foreground">
            Here&apos;s what&apos;s happening with your money.
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">Balance</p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {formatMoney(summary.balance)}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">Total income</p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {formatMoney(summary.totalIncome)}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">Income this month</p>

            <p className="mt-3 text-3xl font-semibold tracking-tight text-success">
              {formatMoney(summary.monthlyIncome)}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">
              Expenses this month
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight text-danger">
              {formatMoney(summary.monthlyExpenses)}
            </p>
          </article>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Recent transactions
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your latest financial activity.
              </p>
            </div>

            <Link
              href="/transactions"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {summary.recentTransactions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No transactions yet</p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Your latest transactions will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between px-6 py-5"
                  >
                    <div>
                      <p className="font-medium">
                        {transaction.description || transaction.category.name}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {transaction.category.name}
                      </p>
                    </div>

                    <p
                      className={`font-semibold ${
                        transaction.type === "INCOME"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {formatMoney(Number(transaction.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}