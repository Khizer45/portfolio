"use client";

import { RequireAuth } from "@/features/admin/auth";
import { AdminShell } from "@/features/admin/shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
