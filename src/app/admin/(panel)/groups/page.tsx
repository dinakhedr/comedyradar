import type { Metadata } from "next";
import { AdminProfilesList } from "@/components/admin/profiles-list";

export const metadata: Metadata = { title: "Groups" };

/** Admin Groups: every group profile (Profiles split into Comedians and Groups). */
export default function AdminGroupsPage({ searchParams }: PageProps<"/admin/groups">) {
  return <AdminProfilesList kind="group" searchParams={searchParams} />;
}
