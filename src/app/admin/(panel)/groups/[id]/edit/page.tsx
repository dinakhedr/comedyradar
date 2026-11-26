import type { Metadata } from "next";
import { AdminProfileEdit } from "@/components/admin/profile-edit";

export const metadata: Metadata = { title: "Edit group" };

/** Admin > Groups > Edit. */
export default function AdminEditGroupPage({ params, searchParams }: PageProps<"/admin/groups/[id]/edit">) {
  return <AdminProfileEdit kind="group" params={params} searchParams={searchParams} />;
}
