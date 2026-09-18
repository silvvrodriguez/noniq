"use client";

import { API_URL } from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  name: string;
  email: string;
};

const navigation = [
  {
    href: "/dashboard",
    label: "Overview",
  },
  {
    href: "/transactions",
    label: "Transactions",
  },
  {
    href: "/categories",
    label: "Categories",
  },
  {
    href: "/budgets",
    label: "Budgets",
  },
  {
    href: "/savings-goals",
    label: "Savings Goals",
  },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentPage =
    navigation.find((item) => item.href === pathname)?.label ?? "Menu";

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("noniq_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
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
          return;
        }

        const data = await response.json();

        setUser(data.user);
      } catch {
        return;
      }
    }

    loadUser();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("noniq_token");
    router.replace("/");
  }

  return (
    <header>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="text-xl font-semibold tracking-tight"
        >
          NONIQ
        </Link>

        {user && (
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:border-foreground hover:bg-muted hover:text-foreground active:scale-95"
          >
            Log out
          </button>
        )}
      </div>

      {/* User */}
      {user && (
        <div className="mt-5 min-w-0 lg:mt-4 lg:text-right">
          <p className="text-sm font-medium">{user.name}</p>

          <p className="break-all text-sm text-muted-foreground lg:break-normal">
            {user.email}
          </p>
        </div>
      )}

      {/* Mobile + tablet navigation */}
      <div className="mt-7 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="flex w-full items-center justify-between border-b border-border pb-4 text-left"
        >
          <span className="text-sm font-semibold">{currentPage}</span>

          <span
            aria-hidden="true"
            className="text-xl leading-none text-muted-foreground"
          >
            {menuOpen ? "×" : "☰"}
          </span>
        </button>

        {menuOpen && (
          <nav
            id="mobile-navigation"
            className="border-b border-border py-2"
          >
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-lg px-3 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-muted font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Desktop navigation */}
      <nav className="mt-8 hidden items-center gap-6 border-b border-border pb-4 lg:flex lg:flex-wrap">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "text-sm font-semibold text-foreground"
                  : "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}