"use client";

import { useState } from "react";

import { errorMessage } from "@/features/admin/api";
import { useApiData } from "@/features/admin/use-api";
import { AdminPageHeader, ErrorState, Pagination, Skeleton, describeChange, formatTimestamp } from "@/features/admin/ui";
import type { AuditEntry, Page } from "@/types/api";

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useApiData<Page<AuditEntry>>(`/admin/audit-logs?page=${page}&page_size=50`);

  return (
    <div>
      <AdminPageHeader title="Activity log" description="Every sign-in and content change, newest first." />
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : !data ? (
        <Skeleton />
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {data.items.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-fg">
                  {entry.action === "login" || entry.action === "logout"
                    ? `${entry.action === "login" ? "Signed in" : "Signed out"}${entry.entity_label ? ` (${entry.entity_label})` : ""}`
                    : describeChange(entry.action, entry.entity_type, entry.entity_label)}
                </span>
                <span className="shrink-0 text-xs text-fg-subtle">
                  {entry.actor ? `${entry.actor} · ` : ""}
                  {entry.ip_address ? `${entry.ip_address} · ` : ""}
                  <time dateTime={entry.created_at}>{formatTimestamp(entry.created_at)}</time>
                </span>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
