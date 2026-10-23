"use client";

import { notFound, useParams } from "next/navigation";

import { ResourceEditor } from "@/features/admin/resource-editor";
import { getResource } from "@/features/admin/resources";

export default function EditResourcePage() {
  const { resource: key, id } = useParams<{ resource: string; id: string }>();
  const resource = getResource(key);
  if (!resource) notFound();
  return <ResourceEditor key={`${resource.key}-${id}`} resource={resource} id={id} />;
}
