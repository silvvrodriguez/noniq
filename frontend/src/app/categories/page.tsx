"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import AppHeader from "../components/AppHeader";

type CategoryType = "INCOME" | "EXPENSE";

type Category = {
  id: string;
  name: string;
  type: CategoryType;
};

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      const token = localStorage.getItem("noniq_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:4000/categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("noniq_token");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          setError("Unable to load categories.");
          return;
        }

        const data = await response.json();

        const categoryList = Array.isArray(data)
          ? data
          : Array.isArray(data.categories)
            ? data.categories
            : [];

        setCategories(categoryList);
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");

    try {
      const response = await fetch("http://localhost:4000/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create category.");
        return;
      }

      const newCategory: Category = data.category ?? data;

      setCategories((current) => [...current, newCategory]);
      setName("");
      setType("EXPENSE");
    } catch {
      setError("Unable to connect to the server.");
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
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8">
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
                  type="text"
                  placeholder="e.g. Food"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
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
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as CategoryType)
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
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
                Add category
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-surface">
            {categories.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">No categories yet</p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first category to start tracking your money.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between px-6 py-5"
                  >
                    <p className="font-medium">{category.name}</p>

                    <span
                      className={`text-sm font-medium ${
                        category.type === "INCOME"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {category.type === "INCOME" ? "Income" : "Expense"}
                    </span>
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