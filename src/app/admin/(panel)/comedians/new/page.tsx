import type { Metadata } from "next";
import { AdminNewProfile } from "@/components/admin/admin-new-profile";

export const metadata: Metadata = { title: "Add new comedian" };

/** Admin > Comedians > Add new comedian. */
export default function AdminNewComedianPage() {
  return <AdminNewProfile kind="comedian" />;
}
