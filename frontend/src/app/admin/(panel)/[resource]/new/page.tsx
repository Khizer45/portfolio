"use client";

import { notFound, useParams } from "next/navigation";

import { ResourceEditor } from "@/features/admin/resource-editor";
import { getResource } from "@/features/admin/resources";

export default function NewResourcePage() {
  const { resource: key } = useParams<{ resource: string }>();
  const resource = getResource(key);
  if (!resource) notFound();
  return <ResourceEditor key={`${resource.key}-new`} resource={resource} />;
}
