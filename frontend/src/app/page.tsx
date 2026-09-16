import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight">NONIQ</span>

          <Link
            href="/login"
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium"
          >
          Sign in
          </Link>
        </header>

        <section className="flex flex-1 items-center">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-medium text-muted-foreground">
              YOUR MONEY, YOUR WAY
            </p>

            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-7xl">
              Personal finance,
              <br />
              made personal.
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">
              Understand where your money goes, plan what comes next, and make
              progress toward the things that matter to you.
            </p>

            <button className="mt-9 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground">
              Get started
            </button>
          </div>
        </section>

        <footer className="text-sm text-muted-foreground">
          Simple finances. Clear decisions.
        </footer>
      </div>
    </main>
  );
}