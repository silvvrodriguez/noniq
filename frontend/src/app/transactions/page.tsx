"use client";

import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import AppHeader from "../components/AppHeader";
import AppShell from "../components/AppShell";

type TransactionType = "INCOME" | "EXPENSE";

type Category = {
  id: string;
  name: string;
  type: TransactionType;
};

type Transaction = {
  id: string;
  amount: string;
  description: string | null;
  type: TransactionType;
  date: string;
  category: Category;
};

export default function TransactionsPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // New transaction form
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  // Filters
  const [filterType, setFilterType] = useState<TransactionType | "">("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );

  const filterCategories = filterType
    ? categories.filter((category) => category.type === filterType)
    : categories;

  const fetchTransactions = useCallback(
    async (
      token: string,
      filters?: {
        type?: TransactionType | "";
        categoryId?: string;
        from?: string;
        to?: string;
      },
    ) => {
      const params = new URLSearchParams();

      if (filters?.type) {
        params.set("type", filters.type);
      }

      if (filters?.categoryId) {
        params.set("categoryId", filters.categoryId);
      }

      if (filters?.from) {
        params.set("from", filters.from);
      }

      if (filters?.to) {
        params.set("to", filters.to);
      }

      const query = params.toString();

      const url = query
        ? `${API_URL}/transactions?${query}`
        : `${API_URL}/transactions`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load your transactions.",
        );
      }

      const transactionList: Transaction[] = Array.isArray(data)
        ? data
        : Array.isArray(data.transactions)
          ? data.transactions
          : [];

      return transactionList;
    },
    [router],
  );

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("noniq_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [categoriesResponse, transactionList] = await Promise.all([
          fetch(`${API_URL}/categories`, { headers }),
          fetchTransactions(token),
        ]);

        if (categoriesResponse.status === 401) {
          localStorage.removeItem("noniq_token");
          router.replace("/login");
          return;
        }

        if (!categoriesResponse.ok) {
          setError("Unable to load your categories.");
          return;
        }

        if (transactionList === null) {
          return;
        }

        const categoriesData = await categoriesResponse.json();

        const categoryList: Category[] = Array.isArray(categoriesData)
          ? categoriesData
          : Array.isArray(categoriesData.categories)
            ? categoriesData.categories
            : [];

        setCategories(categoryList);
        setTransactions(transactionList);

        const firstExpenseCategory = categoryList.find(
          (category) => category.type === "EXPENSE",
        );

        setCategoryId(firstExpenseCategory?.id ?? "");
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to connect to the server.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, fetchTransactions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!categoryId) {
      setError(`Create an ${type.toLowerCase()} category first.`);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          description: description.trim() || undefined,
          type,
          date: new Date(`${date}T12:00:00.000Z`).toISOString(),
          categoryId,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to create transaction.");
        return;
      }

      const refreshedTransactions = await fetchTransactions(token, {
        type: filterType,
        categoryId: filterCategoryId,
        from: filterFrom,
        to: filterTo,
      });

      if (refreshedTransactions === null) {
        return;
      }

      setTransactions(refreshedTransactions);

      setAmount("");
      setDescription("");
      setDate("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApplyFilters() {
    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (filterFrom && filterTo && filterFrom > filterTo) {
      setError("From date cannot be after to date.");
      return;
    }

    setError("");
    setFiltering(true);

    try {
      const transactionList = await fetchTransactions(token, {
        type: filterType,
        categoryId: filterCategoryId,
        from: filterFrom,
        to: filterTo,
      });

      if (transactionList === null) {
        return;
      }

      setTransactions(transactionList);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to apply filters.",
      );
    } finally {
      setFiltering(false);
    }
  }

  async function handleClearFilters() {
    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setFilterType("");
    setFilterCategoryId("");
    setFilterFrom("");
    setFilterTo("");
    setError("");
    setFiltering(true);

    try {
      const transactionList = await fetchTransactions(token);

      if (transactionList === null) {
        return;
      }

      setTransactions(transactionList);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to clear filters.",
      );
    } finally {
      setFiltering(false);
    }
  }

  async function handleExportCsv() {
    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setExporting(true);

    try {
      const response = await fetch(
        `${API_URL}/export/transactions.csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to export your transactions.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "noniq-transactions.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to export your transactions.",
      );
    } finally {
      setExporting(false);
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading transactions...
        </p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader />

      <section className="mt-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              YOUR ACTIVITY
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
              Transactions
            </h1>

            <p className="mt-3 text-muted-foreground">
              Track the money coming in and going out.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="w-fit rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">New transaction</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-medium"
              >
                Type
              </label>

              <select
                id="type"
                value={type}
                onChange={(event) => {
                  const newType = event.target.value as TransactionType;

                  setType(newType);

                  const firstCategory = categories.find(
                    (category) => category.type === newType,
                  );

                  setCategoryId(firstCategory?.id ?? "");
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-medium"
              >
                Amount
              </label>

              <input
                id="amount"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 150000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium"
              >
                Category
              </label>

              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                disabled={filteredCategories.length === 0}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none disabled:opacity-50"
              >
                {filteredCategories.length === 0 ? (
                  <option value="">No categories available</option>
                ) : (
                  filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <input
                id="description"
                type="text"
                maxLength={200}
                placeholder="e.g. Groceries"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="date"
                className="mb-2 block text-sm font-medium"
              >
                Date
              </label>

              <input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add transaction"}
            </button>
          </form>
        </div>

        <div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Filters</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Narrow down your transaction history.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearFilters}
                disabled={filtering}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                Clear filters
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label
                  htmlFor="filterType"
                  className="mb-2 block text-xs font-medium text-muted-foreground"
                >
                  Type
                </label>

                <select
                  id="filterType"
                  value={filterType}
                  onChange={(event) => {
                    const newType = event.target.value as
                      | TransactionType
                      | "";

                    setFilterType(newType);
                    setFilterCategoryId("");
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">All types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="filterCategory"
                  className="mb-2 block text-xs font-medium text-muted-foreground"
                >
                  Category
                </label>

                <select
                  id="filterCategory"
                  value={filterCategoryId}
                  onChange={(event) =>
                    setFilterCategoryId(event.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">All categories</option>

                  {filterCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filterFrom"
                  className="mb-2 block text-xs font-medium text-muted-foreground"
                >
                  From
                </label>

                <input
                  id="filterFrom"
                  type="date"
                  value={filterFrom}
                  onChange={(event) => setFilterFrom(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="filterTo"
                  className="mb-2 block text-xs font-medium text-muted-foreground"
                >
                  To
                </label>

                <input
                  id="filterTo"
                  type="date"
                  value={filterTo}
                  onChange={(event) => setFilterTo(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={filtering}
              className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {filtering ? "Applying..." : "Apply filters"}
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
            {transactions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No transactions found</p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Try changing your filters or add a new transaction.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-6 px-6 py-5"
                  >
                    <div>
                      <p className="font-medium">
                        {transaction.description ||
                          transaction.category.name}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{transaction.category.name}</span>

                        <span aria-hidden="true">·</span>

                        <span>{formatDate(transaction.date)}</span>
                      </div>
                    </div>

                    <p
                      className={`shrink-0 font-semibold ${
                        transaction.type === "INCOME"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {Number(transaction.amount).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}