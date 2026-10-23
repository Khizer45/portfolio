import type { Metadata } from "next";

import { AdminProviders } from "@/features/admin/providers";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/** The admin area: client-rendered, never cached or indexed. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminProviders>{children}</AdminProviders>;
}
