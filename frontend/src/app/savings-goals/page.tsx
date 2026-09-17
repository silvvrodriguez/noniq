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

type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  percentage: number;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function SavingsGoalsPage() {
  const router = useRouter();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTargetAmount, setEditingTargetAmount] = useState("");
  const [editingCurrentAmount, setEditingCurrentAmount] = useState("");
  const [editingTargetDate, setEditingTargetDate] = useState("");

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const fetchGoals = useCallback(
    async (token: string) => {
      const response = await fetch(`${API_URL}/savings-goals`, {
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
        throw new Error("Unable to load savings goals");
      }

      const data = await response.json();

      const goalList: SavingsGoal[] = Array.isArray(data)
        ? data
        : Array.isArray(data.savingsGoals)
          ? data.savingsGoals
          : [];

      return goalList;
    },
    [router],
  );

  useEffect(() => {
    async function loadGoals() {
      const token = localStorage.getItem("noniq_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const goalList = await fetchGoals(token);

        if (goalList === null) {
          return;
        }

        setGoals(goalList);
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadGoals();
  }, [router, fetchGoals]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const parsedTargetAmount = Number(targetAmount);
    const parsedCurrentAmount =
      currentAmount.trim() === "" ? 0 : Number(currentAmount);

    if (!Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
      setError("Target amount must be greater than zero.");
      return;
    }

    if (!Number.isFinite(parsedCurrentAmount) || parsedCurrentAmount < 0) {
      setError("Current amount cannot be negative.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const body: {
        name: string;
        targetAmount: number;
        currentAmount: number;
        targetDate?: string;
      } = {
        name: name.trim(),
        targetAmount: parsedTargetAmount,
        currentAmount: parsedCurrentAmount,
      };

      if (targetDate) {
        body.targetDate = targetDate;
      }

      const response = await fetch(`${API_URL}/savings-goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to create savings goal.");
        return;
      }

      const refreshedGoals = await fetchGoals(token);

      if (refreshedGoals === null) {
        return;
      }

      setGoals(refreshedGoals);

      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setTargetDate("");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(goal: SavingsGoal) {
    setEditingGoalId(goal.id);
    setEditingName(goal.name);
    setEditingTargetAmount(String(goal.targetAmount));
    setEditingCurrentAmount(String(goal.currentAmount));
    setEditingTargetDate(
      goal.targetDate ? goal.targetDate.slice(0, 10) : "",
    );

    setConfirmingDeleteId(null);
    setError("");
  }

  function cancelEditing() {
    setEditingGoalId(null);
    setEditingName("");
    setEditingTargetAmount("");
    setEditingCurrentAmount("");
    setEditingTargetDate("");
    setError("");
  }

  async function handleSaveGoal(goalId: string) {
    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const parsedTargetAmount = Number(editingTargetAmount);
    const parsedCurrentAmount = Number(editingCurrentAmount);

    if (!editingName.trim()) {
      setError("Goal name is required.");
      return;
    }

    if (!Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
      setError("Target amount must be greater than zero.");
      return;
    }

    if (!Number.isFinite(parsedCurrentAmount) || parsedCurrentAmount < 0) {
      setError("Current amount cannot be negative.");
      return;
    }

    setError("");
    setSavingGoalId(goalId);

    try {
      const response = await fetch(`${API_URL}/savings-goals/${goalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingName.trim(),
          targetAmount: parsedTargetAmount,
          currentAmount: parsedCurrentAmount,
          targetDate: editingTargetDate || null,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to update savings goal.");
        return;
      }

      const refreshedGoals = await fetchGoals(token);

      if (refreshedGoals === null) {
        return;
      }

      setGoals(refreshedGoals);

      setEditingGoalId(null);
      setEditingName("");
      setEditingTargetAmount("");
      setEditingCurrentAmount("");
      setEditingTargetDate("");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSavingGoalId(null);
    }
  }

  function startDeleting(goalId: string) {
    setConfirmingDeleteId(goalId);

    setEditingGoalId(null);
    setEditingName("");
    setEditingTargetAmount("");
    setEditingCurrentAmount("");
    setEditingTargetDate("");

    setError("");
  }

  function cancelDeleting() {
    setConfirmingDeleteId(null);
    setError("");
  }

  async function handleDeleteGoal(goalId: string) {
    const token = localStorage.getItem("noniq_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setDeletingGoalId(goalId);

    try {
      const response = await fetch(`${API_URL}/savings-goals/${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("noniq_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to delete savings goal.");
        return;
      }

      const refreshedGoals = await fetchGoals(token);

      if (refreshedGoals === null) {
        return;
      }

      setGoals(refreshedGoals);
      setConfirmingDeleteId(null);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setDeletingGoalId(null);
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading savings goals...
        </p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader />

      <section className="mt-16">
        <p className="text-sm font-medium text-muted-foreground">
          SAVE WITH PURPOSE
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
          Savings Goals
        </h1>

        <p className="mt-3 text-muted-foreground">
          Set financial goals and track your progress over time.
        </p>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">New savings goal</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Goal name
              </label>

              <input
                id="name"
                type="text"
                maxLength={100}
                placeholder="e.g. New notebook"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="targetAmount"
                className="mb-2 block text-sm font-medium"
              >
                Target amount
              </label>

              <input
                id="targetAmount"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 8000000"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="currentAmount"
                className="mb-2 block text-sm font-medium"
              >
                Already saved
              </label>

              <input
                id="currentAmount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={currentAmount}
                onChange={(event) => setCurrentAmount(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Optional. Leave empty if you&apos;re starting from zero.
              </p>
            </div>

            <div>
              <label
                htmlFor="targetDate"
                className="mb-2 block text-sm font-medium"
              >
                Target date
              </label>

              <input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              />

              <p className="mt-2 text-xs text-muted-foreground">Optional.</p>
            </div>

            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create goal"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
              <p className="font-medium">No savings goals yet</p>

              <p className="mt-2 text-sm text-muted-foreground">
                Create your first goal and start tracking your progress.
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = Math.min(
                Math.max(goal.percentage, 0),
                100,
              );

              const isEditing = editingGoalId === goal.id;
              const isConfirmingDelete = confirmingDeleteId === goal.id;
              const isSaving = savingGoalId === goal.id;
              const isDeleting = deletingGoalId === goal.id;

              return (
                <article
                  key={goal.id}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{goal.name}</p>

                      {goal.targetDate && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Target {formatDate(goal.targetDate)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-sm font-medium">
                        {goal.percentage}% saved
                      </p>

                      {!isEditing && !isConfirmingDelete && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(goal)}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => startDeleting(goal.id)}
                            className="text-sm font-medium text-danger"
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
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  {isEditing ? (
                    <div className="mt-5 rounded-xl border border-border bg-background p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`goal-name-${goal.id}`}
                            className="block text-sm font-medium"
                          >
                            Goal name
                          </label>

                          <input
                            id={`goal-name-${goal.id}`}
                            type="text"
                            maxLength={100}
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`goal-date-${goal.id}`}
                            className="block text-sm font-medium"
                          >
                            Target date
                          </label>

                          <input
                            id={`goal-date-${goal.id}`}
                            type="date"
                            value={editingTargetDate}
                            onChange={(event) =>
                              setEditingTargetDate(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`goal-target-${goal.id}`}
                            className="block text-sm font-medium"
                          >
                            Target amount
                          </label>

                          <input
                            id={`goal-target-${goal.id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={editingTargetAmount}
                            onChange={(event) =>
                              setEditingTargetAmount(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`goal-current-${goal.id}`}
                            className="block text-sm font-medium"
                          >
                            Already saved
                          </label>

                          <input
                            id={`goal-current-${goal.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={editingCurrentAmount}
                            onChange={(event) =>
                              setEditingCurrentAmount(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleSaveGoal(goal.id)}
                          disabled={isSaving}
                          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div className="mt-5 rounded-xl border border-border bg-background p-4">
                      <p className="font-medium">Delete this savings goal?</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        This will permanently remove the goal &quot;
                        {goal.name}&quot;.
                      </p>

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(goal.id)}
                          disabled={isDeleting}
                          className="rounded-xl bg-danger px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting..." : "Delete goal"}
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
                    <div className="mt-5 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Target
                        </p>

                        <p className="mt-1 font-medium">
                          {goal.targetAmount.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Saved
                        </p>

                        <p className="mt-1 font-medium">
                          {goal.currentAmount.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Remaining
                        </p>

                        <p className="mt-1 font-medium">
                          {goal.remaining.toLocaleString()}
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