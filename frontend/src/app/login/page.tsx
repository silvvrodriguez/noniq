"use client";

import { API_URL } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      let data: {
        message?: string;
        token?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        // The server may return a response without a JSON body.
      }

      if (!response.ok) {
        setError(data.message || "Unable to sign in.");
        return;
      }

      if (!data.token) {
        setError("Authentication token was not received.");
        return;
      }

      localStorage.setItem("noniq_token", data.token);

      router.push("/dashboard");
    } catch {
      setError(
        "Unable to connect to Noniq. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header>
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight transition-opacity duration-150 hover:opacity-60"
          >
            NONIQ
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                WELCOME BACK
              </p>

              <h1 className="text-4xl font-semibold tracking-[-0.03em]">
                Sign in to Noniq
              </h1>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Enter your details to access your finances.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {error && (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-foreground transition-opacity duration-150 hover:opacity-60"
              >
                Create account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}