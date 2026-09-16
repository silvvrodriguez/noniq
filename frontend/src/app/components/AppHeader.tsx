"use client";

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
  { href: "/budgets", 
    label: "Budgets" 
  },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("noniq_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:4000/auth/me", {
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

  return (
    <header>
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-xl font-semibold tracking-tight"
        >
          NONIQ
        </Link>

        {user && (
          <div className="text-right">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        )}
      </div>

      <nav className="mt-8 flex items-center gap-6 border-b border-border pb-4">
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