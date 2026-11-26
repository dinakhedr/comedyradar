import type { Metadata } from "next";
import { AdminProfileEdit } from "@/components/admin/profile-edit";

export const metadata: Metadata = { title: "Edit comedian" };

/** Admin > Comedians > Edit. */
export default function AdminEditComedianPage({ params, searchParams }: PageProps<"/admin/comedians/[id]/edit">) {
  return <AdminProfileEdit kind="comedian" params={params} searchParams={searchParams} />;
}
