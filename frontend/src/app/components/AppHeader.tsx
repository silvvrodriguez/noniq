"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppHeaderProps = {
  user?: {
    name: string;
    email: string;
  };
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
];

export default function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();

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