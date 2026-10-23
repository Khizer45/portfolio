"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { site } from "@/data/site";
import { ApiError, api, errorMessage, revalidatePublicSite } from "@/features/admin/api";
import { useConfirm } from "@/features/admin/confirm";
import { ResourceForm } from "@/features/admin/form/resource-form";
import type { FormValues } from "@/features/admin/form/types";
import { toFormValues } from "@/features/admin/form/validation";
import type { ResourceDef } from "@/features/admin/resources";
import { useToast } from "@/features/admin/toast";
import { useApiData } from "@/features/admin/use-api";
import { AdminPageHeader, ErrorState, Skeleton } from "@/features/admin/ui";
import type { AdminRecord } from "@/types/api";

/** Create (no id) or edit (id) form for any resource. */
export function ResourceEditor({ resource, id }: { resource: ResourceDef; id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: record, error, reload, setData: setRecord } = useApiData<AdminRecord>(
    id ? `${resource.endpoint}/${id}` : null,
  );
  const notFound = error instanceof ApiError && (error.status === 404 || error.status === 422);
  // Remount the form with fresh values after each save.
  const [version, setVersion] = useState(0);

  const initialValues = useMemo(() => toFormValues(resource.sections, record ?? {}), [resource.sections, record]);

  async function save(payload: FormValues) {
    if (id) {
      const updated = await api.put<AdminRecord>(`${resource.endpoint}/${id}`, payload);
      setRecord(updated);
      setVersion((v) => v + 1);
      toast.success(`Saved ${resource.titleOf(updated)}.`);
    } else {
      const created = await api.post<AdminRecord>(resource.endpoint, payload);
      toast.success(`Created ${resource.titleOf(created)}.`);
      router.replace(`/admin/${resource.key}/${created.id}`);
    }
    revalidatePublicSite();
  }

  async function remove() {
    if (!record) return;
    const ok = await confirm({
      title: `Delete ${resource.singular}?`,
      message: (
        <>
          <strong className="text-fg">{resource.titleOf(record)}</strong> will be permanently deleted. This cannot be undone.
        </>
      ),
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`${resource.endpoint}/${record.id}`);
      toast.success(`Deleted ${resource.titleOf(record)}.`);
      revalidatePublicSite();
      router.replace(`/admin/${resource.key}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const breadcrumb = (
    <Link href={`/admin/${resource.key}`} className="hover:text-fg">
      ← {resource.title}
    </Link>
  );

  if (notFound) {
    return (
      <div>
        <AdminPageHeader title={`${resource.singular[0].toUpperCase()}${resource.singular.slice(1)} not found`} breadcrumb={breadcrumb} />
        <ErrorState message="It may have been deleted." />
      </div>
    );
  }
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (id && !record) {
    return (
      <>
        <title>{`Edit ${resource.singular} · Admin · ${site.ownerName}`}</title>
        <Skeleton rows={8} />
      </>
    );
  }

  const publicHref = record ? resource.publicHref?.(record) : null;

  return (
    <div>
      <AdminPageHeader
        breadcrumb={breadcrumb}
        title={record ? resource.titleOf(record) || "(untitled)" : `New ${resource.singular}`}
        description={record ? undefined : resource.description}
        actions={
          publicHref ? (
            <a href={publicHref} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <ExternalLink aria-hidden="true" /> View on site
            </a>
          ) : undefined
        }
      />
      <ResourceForm
        key={`${record?.id ?? "new"}-${version}`}
        sections={resource.sections}
        initialValues={initialValues}
        onSubmit={save}
        submitLabel={record ? "Save changes" : `Create ${resource.singular}`}
        isNew={!record}
        secondaryActions={
          record ? (
            <button type="button" onClick={remove} className={buttonClasses({ variant: "ghost", size: "sm", className: "hover:text-tone-amber" })}>
              <Trash2 aria-hidden="true" /> Delete
            </button>
          ) : (
            <Link href={`/admin/${resource.key}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Cancel
            </Link>
          )
        }
      />
    </div>
  );
}
