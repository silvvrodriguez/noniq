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

  // Edit / delete transaction
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<TransactionType>("EXPENSE");
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );

  const filterCategories = filterType
    ? categories.filter((category) => category.type === filterType)
    : categories;

  const hasActiveFilters = Boolean(
    filterType || filterCategoryId || filterFrom || filterTo,
  );

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

      let data: { message?: string; transactions?: Transaction[] } | Transaction[] = [];

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (!response.ok) {
        throw new Error(
          (!Array.isArray(data) && data.message) ||
            "Unable to load your transactions.",
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

    if (submitting) {
      return;
    }

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

  function startEditing(transaction: Transaction) {
    if (savingEdit || deletingId || pendingDeleteId) {
      return;
    }

    setError("");
    setEditingId(transaction.id);
    setEditType(transaction.type);
    setEditAmount(transaction.amount);
    setEditCategoryId(transaction.category.id);
    setEditDescription(transaction.description ?? "");
    setEditDate(transaction.date.slice(0, 10));
  }

  function cancelEditing() {
    if (savingEdit) {
      return;
    }

    setEditingId(null);
    setEditAmount("");
    setEditDescription("");
    setEditDate("");
    setEditCategoryId("");
  }

  function handleEditTypeChange(newType: TransactionType) {
    setEditType(newType);

    const firstCategory = categories.find(
      (category) => category.type === newType,
    );

    setEditCategoryId(firstCategory?.id ?? "");
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId || savingEdit) {
      return;
    }

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!editCategoryId) {
      setError(`Create an ${editType.toLowerCase()} category first.`);
      return;
    }

    setError("");
    setSavingEdit(true);

    try {
      const response = await fetch(`${API_URL}/transactions/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(editAmount),
          description: editDescription.trim() || null,
          type: editType,
          date: new Date(`${editDate}T12:00:00.000Z`).toISOString(),
          categoryId: editCategoryId,
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
        setError(data.message || "Unable to update transaction.");
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
      setEditingId(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update transaction.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(transaction: Transaction) {
    if (deletingId) {
      return;
    }

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setDeletingId(transaction.id);

    try {
      const response = await fetch(`${API_URL}/transactions/${transaction.id}`, {
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
        setError(data.message || "Unable to delete transaction.");
        return;
      }

      setTransactions((currentTransactions) =>
        currentTransactions.filter((item) => item.id !== transaction.id),
      );

      if (editingId === transaction.id) {
        setEditingId(null);
      }

      setPendingDeleteId(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete transaction.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleApplyFilters() {
    if (filtering) {
      return;
    }

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
    if (filtering) {
      return;
    }

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
    if (exporting) {
      return;
    }

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

      {error && (
        <div
          className="mt-6 rounded-xl border border-danger/20 bg-surface px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </div>
      )}

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
                disabled={submitting}
                onChange={(event) => {
                  const newType = event.target.value as TransactionType;

                  setType(newType);

                  const firstCategory = categories.find(
                    (category) => category.type === newType,
                  );

                  setCategoryId(firstCategory?.id ?? "");
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={submitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={submitting || filteredCategories.length === 0}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={submitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={submitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
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
                <p className="font-medium">
                  {hasActiveFilters
                    ? "No transactions match your filters"
                    : "No transactions yet"}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Try changing or clearing your filters."
                    : "Add your first transaction to start tracking your activity."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((transaction) => {
                  const isEditing = editingId === transaction.id;
                  const editCategories = categories.filter(
                    (category) => category.type === editType,
                  );

                  if (isEditing) {
                    return (
                      <form
                        key={transaction.id}
                        onSubmit={handleSaveEdit}
                        className="px-6 py-6"
                      >
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                          <div>
                            <label
                              htmlFor={`edit-type-${transaction.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Type
                            </label>
                            <select
                              id={`edit-type-${transaction.id}`}
                              value={editType}
                              onChange={(event) =>
                                handleEditTypeChange(
                                  event.target.value as TransactionType,
                                )
                              }
                              disabled={savingEdit}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="EXPENSE">Expense</option>
                              <option value="INCOME">Income</option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-amount-${transaction.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Amount
                            </label>
                            <input
                              id={`edit-amount-${transaction.id}`}
                              type="number"
                              min="1"
                              step="1"
                              value={editAmount}
                              onChange={(event) =>
                                setEditAmount(event.target.value)
                              }
                              disabled={savingEdit}
                              required
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-category-${transaction.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Category
                            </label>
                            <select
                              id={`edit-category-${transaction.id}`}
                              value={editCategoryId}
                              onChange={(event) =>
                                setEditCategoryId(event.target.value)
                              }
                              disabled={savingEdit || editCategories.length === 0}
                              required
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {editCategories.length === 0 ? (
                                <option value="">No categories available</option>
                              ) : (
                                editCategories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-date-${transaction.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Date
                            </label>
                            <input
                              id={`edit-date-${transaction.id}`}
                              type="date"
                              value={editDate}
                              onChange={(event) => setEditDate(event.target.value)}
                              disabled={savingEdit}
                              required
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="sm:col-span-2 xl:col-span-1">
                            <label
                              htmlFor={`edit-description-${transaction.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Description
                            </label>
                            <input
                              id={`edit-description-${transaction.id}`}
                              type="text"
                              maxLength={200}
                              value={editDescription}
                              onChange={(event) =>
                                setEditDescription(event.target.value)
                              }
                              disabled={savingEdit}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={savingEdit || editCategories.length === 0}
                            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingEdit ? "Saving..." : "Save changes"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={savingEdit}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div key={transaction.id} className="px-6 py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {transaction.description || transaction.category.name}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{transaction.category.name}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatDate(transaction.date)}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
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

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => startEditing(transaction)}
                              disabled={
                                deletingId !== null ||
                                savingEdit ||
                                pendingDeleteId !== null
                              }
                              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setError("");
                                setPendingDeleteId(transaction.id);
                              }}
                              disabled={
                                deletingId !== null ||
                                savingEdit ||
                                pendingDeleteId !== null
                              }
                              className="text-sm font-medium text-danger transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {pendingDeleteId === transaction.id && (
                        <div className="mt-5 rounded-xl border border-border bg-background p-4">
                          <p className="font-medium">
                            Delete this transaction?
                          </p>

                          <p className="mt-2 text-sm text-muted-foreground">
                            This will permanently remove{" "}
                            &quot;
                            {transaction.description ||
                              transaction.category.name}
                            &quot;.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => handleDelete(transaction)}
                              disabled={deletingId === transaction.id}
                              className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                            >
                              {deletingId === transaction.id
                                ? "Deleting..."
                                : "Delete transaction"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              disabled={deletingId === transaction.id}
                              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}