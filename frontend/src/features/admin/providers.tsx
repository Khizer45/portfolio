"use client";

import { AuthProvider } from "@/features/admin/auth";
import { ConfirmProvider } from "@/features/admin/confirm";
import { ToastProvider } from "@/features/admin/toast";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>{children}</AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
