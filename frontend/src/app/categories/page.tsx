"use client";

import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import AppHeader from "../components/AppHeader";
import AppShell from "../components/AppShell";

type CategoryType = "INCOME" | "EXPENSE";

type Category = {
  id: string;
  name: string;
  type: CategoryType;
};

type ApiResponse = {
  message?: string;
  category?: Category;
};

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);

  // New category
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("EXPENSE");

  // Page states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Edit / delete
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryType>("EXPENSE");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleUnauthorized() {
    localStorage.removeItem("noniq_token");
    router.replace("/login");
  }

  useEffect(() => {
    async function loadCategories() {
      const token = localStorage.getItem("noniq_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("noniq_token");
          router.replace("/login");
          return;
        }

        let data:
          | {
              message?: string;
              categories?: Category[];
            }
          | Category[] = [];

        try {
          data = await response.json();
        } catch {
          // The server may return a response without a JSON body.
        }

        if (!response.ok) {
          const message =
            !Array.isArray(data) && data.message
              ? data.message
              : "Unable to load categories.";

          setError(message);
          return;
        }

        const categoryList: Category[] = Array.isArray(data)
          ? data
          : Array.isArray(data.categories)
            ? data.categories
            : [];

        setCategories(categoryList);
      } catch {
        setError(
          "Unable to connect to Noniq. Check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCategories();
  }, [router]);

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

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          type,
        }),
      });

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to create category.");
        return;
      }

      if (!data.category) {
        setError("The category was created, but its data could not be loaded.");
        return;
      }

      setCategories((current) => [...current, data.category as Category]);

      setName("");
      setType("EXPENSE");
    } catch {
      setError(
        "Unable to connect to Noniq. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(category: Category) {
    if (savingEdit || deletingId) {
      return;
    }

    setError("");
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
  }

  function cancelEditing() {
    if (savingEdit) {
      return;
    }

    setEditingId(null);
    setEditName("");
    setEditType("EXPENSE");
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

    const trimmedName = editName.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    setError("");
    setSavingEdit(true);

    try {
      const response = await fetch(`${API_URL}/categories/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          type: editType,
        }),
      });

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to update category.");
        return;
      }

      if (!data.category) {
        setError("The category was updated, but its data could not be loaded.");
        return;
      }

      const updatedCategory = data.category;

      setCategories((current) =>
        current.map((category) =>
          category.id === updatedCategory.id ? updatedCategory : category,
        ),
      );

      setEditingId(null);
      setEditName("");
      setEditType("EXPENSE");
    } catch {
      setError(
        "Unable to connect to Noniq. Check your connection and try again.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(category: Category) {
    if (deletingId || savingEdit) {
      return;
    }

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setDeletingId(category.id);

    try {
      const response = await fetch(`${API_URL}/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 409) {
        setPendingDeleteId(null);
        setError(
          data.message ||
            "This category cannot be deleted because it is currently in use.",
        );
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to delete category.");
        return;
      }

      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );

      if (editingId === category.id) {
        setEditingId(null);
      }

      setPendingDeleteId(null);
    } catch {
      setError(
        "Unable to connect to Noniq. Check your connection and try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading categories...
        </p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader />

      <section className="mt-16">
        <p className="text-sm font-medium text-muted-foreground">
          ORGANIZE YOUR MONEY
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
          Categories
        </h1>

        <p className="mt-3 text-muted-foreground">
          Create categories for your income and expenses.
        </p>
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">New category</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="off"
                maxLength={100}
                placeholder="e.g. Food"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={submitting}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-medium"
              >
                Type
              </label>

              <select
                id="type"
                name="type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as CategoryType)
                }
                disabled={submitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {submitting ? "Adding..." : "Add category"}
            </button>
          </form>
        </div>

        <div className="min-w-0">
          {error && (
            <div
              className="mb-4 rounded-xl border border-border bg-surface px-4 py-3"
              role="alert"
            >
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {categories.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No categories yet</p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first category to start tracking your money.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((category) => {
                  const isEditing = editingId === category.id;

                  if (isEditing) {
                    return (
                      <form
                        key={category.id}
                        onSubmit={handleSaveEdit}
                        className="px-6 py-5"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`edit-name-${category.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Name
                            </label>

                            <input
                              id={`edit-name-${category.id}`}
                              type="text"
                              maxLength={100}
                              value={editName}
                              onChange={(event) =>
                                setEditName(event.target.value)
                              }
                              disabled={savingEdit}
                              required
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-type-${category.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Type
                            </label>

                            <select
                              id={`edit-type-${category.id}`}
                              value={editType}
                              onChange={(event) =>
                                setEditType(
                                  event.target.value as CategoryType,
                                )
                              }
                              disabled={savingEdit}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="EXPENSE">Expense</option>
                              <option value="INCOME">Income</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={savingEdit}
                            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                          >
                            {savingEdit ? "Saving..." : "Save changes"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={savingEdit}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div key={category.id} className="px-6 py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words font-medium">
                            {category.name}
                          </p>

                          <p
                            className={`mt-1 text-sm font-medium ${
                              category.type === "INCOME"
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {category.type === "INCOME"
                              ? "Income"
                              : "Expense"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEditing(category)}
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
                              setPendingDeleteId(category.id);
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

                      {pendingDeleteId === category.id && (
                        <div className="mt-5 rounded-xl border border-border bg-background p-4">
                          <p className="font-medium">Delete this category?</p>

                          <p className="mt-2 text-sm text-muted-foreground">
                            This will permanently remove the category &quot;
                            {category.name}&quot;.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => handleDelete(category)}
                              disabled={deletingId === category.id}
                              className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                            >
                              {deletingId === category.id
                                ? "Deleting..."
                                : "Delete category"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              disabled={deletingId === category.id}
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