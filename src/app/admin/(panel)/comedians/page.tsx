import type { Metadata } from "next";
import { AdminProfilesList } from "@/components/admin/profiles-list";

export const metadata: Metadata = { title: "Comedians" };

/** Admin Comedians: every comedian profile (Profiles split into Comedians and Groups). */
export default function AdminComediansPage({ searchParams }: PageProps<"/admin/comedians">) {
  return <AdminProfilesList kind="comedian" searchParams={searchParams} />;
}
