"use client";

import { useState } from "react";

import { ApiError, api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { ResourceForm } from "@/features/admin/form/resource-form";
import type { FormSection, FormValues } from "@/features/admin/form/types";
import { useToast } from "@/features/admin/toast";
import { AdminPageHeader, Card, formatTimestamp } from "@/features/admin/ui";

const SECTIONS: FormSection[] = [
  {
    title: "Change password",
    description: "At least 12 characters. A long passphrase is easiest to remember. Other devices are signed out after the change.",
    fields: [
      { name: "current_password", label: "Current password", type: "password", autoComplete: "current-password", required: true, wide: true },
      { name: "new_password", label: "New password", type: "password", autoComplete: "new-password", required: true },
      { name: "confirm_password", label: "Repeat new password", type: "password", autoComplete: "new-password", required: true },
    ],
  },
];

export default function AccountPage() {
  const auth = useAuth();
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const user = auth.status === "authenticated" ? auth.user : null;

  async function save(values: FormValues) {
    if (values.new_password !== values.confirm_password) {
      throw new ApiError(422, "The new passwords do not match.", { confirm_password: "Must match the new password." });
    }
    await api.put("/auth/password", { current_password: values.current_password, new_password: values.new_password });
    toast.success("Password changed. Other sessions were signed out.");
    setVersion((v) => v + 1);
  }

  return (
    <div>
      <AdminPageHeader title="Account & password" />
      {user && (
        <Card className="mb-6 p-5 text-sm">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-fg-subtle">Name</dt>
              <dd className="mt-0.5 font-medium">{user.display_name}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Email</dt>
              <dd className="mt-0.5 font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Last sign-in</dt>
              <dd className="mt-0.5 font-medium">{user.last_login_at ? formatTimestamp(user.last_login_at) : "—"}</dd>
            </div>
          </dl>
        </Card>
      )}
      <ResourceForm
        key={version}
        sections={SECTIONS}
        initialValues={{ current_password: "", new_password: "", confirm_password: "" }}
        onSubmit={save}
        submitLabel="Change password"
        isNew
      />
    </div>
  );
}
