"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    try {
      const response = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none"
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
                Sign in
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-foreground">
                Create account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}