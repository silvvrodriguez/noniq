import { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </main>
  );
}