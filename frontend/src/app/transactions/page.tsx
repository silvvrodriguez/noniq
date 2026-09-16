"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredCategories = categories.filter(
    (category) => category.type === type,
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

        const [categoriesResponse, transactionsResponse] = await Promise.all([
          fetch("http://localhost:4000/categories", { headers }),
          fetch("http://localhost:4000/transactions", { headers }),
        ]);

        if (
          categoriesResponse.status === 401 ||
          transactionsResponse.status === 401
        ) {
          localStorage.removeItem("noniq_token");
          router.replace("/login");
          return;
        }

        if (!categoriesResponse.ok || !transactionsResponse.ok) {
          setError("Unable to load your transactions.");
          return;
        }

        const categoriesData = await categoriesResponse.json();
        const transactionsData = await transactionsResponse.json();

        const categoryList: Category[] = Array.isArray(categoriesData)
          ? categoriesData
          : Array.isArray(categoriesData.categories)
            ? categoriesData.categories
            : [];

        const transactionList: Transaction[] = Array.isArray(transactionsData)
          ? transactionsData
          : Array.isArray(transactionsData.transactions)
            ? transactionsData.transactions
            : [];

        setCategories(categoryList);
        setTransactions(transactionList);

        const firstExpenseCategory = categoryList.find(
          (category) => category.type === "EXPENSE",
        );

        setCategoryId(firstExpenseCategory?.id ?? "");
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

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

    try {
      const response = await fetch("http://localhost:4000/transactions", {
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

      if (!response.ok) {
        setError(data.message || "Unable to create transaction.");
        return;
      }

      const newTransaction: Transaction = data.transaction ?? data;

      setTransactions((current) => [newTransaction, ...current]);

      setAmount("");
      setDescription("");
      setDate("");
    } catch {
      setError("Unable to connect to the server.");
    }
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
        <p className="text-sm font-medium text-muted-foreground">
          YOUR ACTIVITY
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
          Transactions
        </h1>

        <p className="mt-3 text-muted-foreground">
          Track the money coming in and going out.
        </p>
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

            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground"
            >
              Add transaction
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">No transactions yet</p>

              <p className="mt-2 text-sm text-muted-foreground">
                Add your first transaction to start tracking your money.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((transaction) => (
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
                    {Number(transaction.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}