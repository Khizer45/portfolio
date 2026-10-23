"use client";

import { notFound, useParams } from "next/navigation";

import { ResourceList } from "@/features/admin/resource-list";
import { getResource } from "@/features/admin/resources";

export default function ResourceListPage() {
  const { resource: key } = useParams<{ resource: string }>();
  const resource = getResource(key);
  if (!resource) notFound();
  return <ResourceList key={resource.key} resource={resource} />;
}
