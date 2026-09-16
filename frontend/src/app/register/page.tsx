"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("PYG");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    try {
      const response = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create account.");
        return;
      }

      router.push("/login");
    } catch {
      setError("Unable to connect to the server.");
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header>
          <span className="text-xl font-semibold tracking-tight">NONIQ</span>
        </header>

        <section className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                GET STARTED
              </p>

              <h1 className="text-4xl font-semibold tracking-[-0.03em]">
                Create your account
              </h1>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Start organizing your finances with Noniq.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
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
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="currency"
                  className="mb-2 block text-sm font-medium"
                >
                  Currency
                </label>

                <select
                  id="currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
                >
                  <option value="PYG">PYG — Paraguayan guaraní</option>
                  <option value="USD">USD — US dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="BRL">BRL — Brazilian real</option>
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
                Create account
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}