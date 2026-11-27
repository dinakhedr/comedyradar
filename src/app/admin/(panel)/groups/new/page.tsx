import type { Metadata } from "next";
import { AdminNewProfile } from "@/components/admin/admin-new-profile";

export const metadata: Metadata = { title: "Add new group" };

/** Admin > Groups > Add new group. */
export default function AdminNewGroupPage() {
  return <AdminNewProfile kind="group" />;
}
