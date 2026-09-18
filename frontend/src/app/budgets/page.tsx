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

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

type Budget = {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  month: string;
  category: {
    id: string;
    name: string;
  };
};

export default function BudgetsPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingBudgetId, setSavingBudgetId] = useState<string | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const fetchBudgets = useCallback(
    async (token: string) => {
      const response = await fetch(`${API_URL}/budgets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return null;
      }

      if (!response.ok) {
        throw new Error("Unable to load budgets");
      }

      const data = await response.json();

      const budgetList: Budget[] = Array.isArray(data)
        ? data
        : Array.isArray(data.budgets)
          ? data.budgets
          : [];

      return budgetList;
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
        const categoriesResponse = await fetch(`${API_URL}/categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (categoriesResponse.status === 401) {
          localStorage.removeItem("noniq_token");
          router.replace("/login");
          return;
        }

        if (!categoriesResponse.ok) {
          setError("Unable to load your budgets.");
          return;
        }

        const categoriesData = await categoriesResponse.json();

        const categoryList: Category[] = Array.isArray(categoriesData)
          ? categoriesData
          : Array.isArray(categoriesData.categories)
            ? categoriesData.categories
            : [];

        const expenseCategories = categoryList.filter(
          (category) => category.type === "EXPENSE",
        );

        const budgetList = await fetchBudgets(token);

        if (budgetList === null) {
          return;
        }

        setCategories(expenseCategories);
        setBudgets(budgetList);
        setCategoryId(expenseCategories[0]?.id ?? "");
      } catch {
        setError("Unable to connect to Noniq. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, fetchBudgets]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!categoryId) {
      setError("Create an expense category first.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/budgets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          month: `${month}-01`,
          categoryId,
        }),
      });

      let data: { message?: string } = {};

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to create budget.");
        return;
      }

      const refreshedBudgets = await fetchBudgets(token);

      if (refreshedBudgets === null) {
        return;
      }

      setBudgets(refreshedBudgets);
      setAmount("");
      setMonth("");
    } catch {
      setError("Unable to connect to Noniq. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(budget: Budget) {
    if (savingBudgetId || deletingBudgetId || confirmingDeleteId) {
      return;
    }

    setEditingBudgetId(budget.id);
    setEditingAmount(String(budget.amount));
    setConfirmingDeleteId(null);
    setError("");
  }

  function cancelEditing() {
    setEditingBudgetId(null);
    setEditingAmount("");
    setError("");
  }

  async function handleSaveBudget(budgetId: string) {
    if (savingBudgetId || deletingBudgetId) {
      return;
    }

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const newAmount = Number(editingAmount);

    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      setError("Budget amount must be greater than zero.");
      return;
    }

    setError("");
    setSavingBudgetId(budgetId);

    try {
      const response = await fetch(`${API_URL}/budgets/${budgetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: newAmount,
        }),
      });

      let data: { message?: string } = {};

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to update budget.");
        return;
      }

      const refreshedBudgets = await fetchBudgets(token);

      if (refreshedBudgets === null) {
        return;
      }

      setBudgets(refreshedBudgets);
      setEditingBudgetId(null);
      setEditingAmount("");
    } catch {
      setError("Unable to connect to Noniq. Check your connection and try again.");
    } finally {
      setSavingBudgetId(null);
    }
  }

  function startDeleting(budgetId: string) {
    if (savingBudgetId || deletingBudgetId || confirmingDeleteId) {
      return;
    }

    setConfirmingDeleteId(budgetId);
    setEditingBudgetId(null);
    setEditingAmount("");
    setError("");
  }

  function cancelDeleting() {
    setConfirmingDeleteId(null);
    setError("");
  }

  async function handleDeleteBudget(budgetId: string) {
    if (deletingBudgetId || savingBudgetId) {
      return;
    }

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setDeletingBudgetId(budgetId);

    try {
      const response = await fetch(`${API_URL}/budgets/${budgetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data: { message?: string } = {};

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to delete budget.");
        return;
      }

      const refreshedBudgets = await fetchBudgets(token);

      if (refreshedBudgets === null) {
        return;
      }

      setBudgets(refreshedBudgets);
      setConfirmingDeleteId(null);
    } catch {
      setError("Unable to connect to Noniq. Check your connection and try again.");
    } finally {
      setDeletingBudgetId(null);
    }
  }

  function formatMonth(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading budgets...</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader />

      <section className="mt-16">
        <p className="text-sm font-medium text-muted-foreground">
          PLAN YOUR SPENDING
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
          Budgets
        </h1>

        <p className="mt-3 text-muted-foreground">
          Set monthly spending limits and see how you&apos;re doing.
        </p>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">New budget</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                placeholder="e.g. 1000000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="month"
                className="mb-2 block text-sm font-medium"
              >
                Month
              </label>

              <input
                id="month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
                disabled={submitting || categories.length === 0}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {categories.length === 0 ? (
                  <option value="">No expense categories available</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || categories.length === 0}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {submitting ? "Creating..." : "Create budget"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {budgets.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
              <p className="font-medium">No budgets yet</p>

              <p className="mt-2 text-sm text-muted-foreground">
                Create your first monthly budget to start planning your
                spending.
              </p>
            </div>
          ) : (
            budgets.map((budget) => {
              const progress = Math.min(Math.max(budget.percentage, 0), 100);
              const isEditing = editingBudgetId === budget.id;
              const isConfirmingDelete = confirmingDeleteId === budget.id;
              const isSaving = savingBudgetId === budget.id;
              const isDeleting = deletingBudgetId === budget.id;

              return (
                <article
                  key={budget.id}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{budget.category.name}</p>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatMonth(budget.month)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-sm font-medium">
                        {budget.percentage}% used
                      </p>

                      {!isEditing && !isConfirmingDelete && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(budget)}
                            disabled={
                              savingBudgetId !== null ||
                              deletingBudgetId !== null ||
                              confirmingDeleteId !== null
                            }
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => startDeleting(budget.id)}
                            disabled={
                              savingBudgetId !== null ||
                              deletingBudgetId !== null ||
                              confirmingDeleteId !== null
                            }
                            className="text-sm font-medium text-danger transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {isEditing ? (
                    <div className="mt-5 rounded-xl border border-border bg-background p-4">
                      <label
                        htmlFor={`budget-${budget.id}`}
                        className="block text-sm font-medium"
                      >
                        Budget amount
                      </label>

                      <input
                        id={`budget-${budget.id}`}
                        type="number"
                        min="1"
                        step="1"
                        value={editingAmount}
                        onChange={(event) =>
                          setEditingAmount(event.target.value)
                        }
                        disabled={isSaving}
                        className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleSaveBudget(budget.id)}
                          disabled={isSaving}
                          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div className="mt-5 rounded-xl border border-border bg-background p-4">
                      <p className="font-medium">Delete this budget?</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        This will remove the budget for{" "}
                        {budget.category.name} in {formatMonth(budget.month)}.
                        Your transactions will not be deleted.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(budget.id)}
                          disabled={isDeleting}
                          className="rounded-xl bg-danger px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                        >
                          {isDeleting ? "Deleting..." : "Delete budget"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelDeleting}
                          disabled={isDeleting}
                          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>

                        <p className="mt-1 font-medium">
                          {budget.amount.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>

                        <p className="mt-1 font-medium">
                          {budget.spent.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Remaining
                        </p>

                        <p className="mt-1 font-medium">
                          {budget.remaining.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </AppShell>
  );
}