import type { Metadata } from "next";
import { Suspense } from "react";
import { ComedianImport, ShowImport } from "@/components/admin/bulk-import";
import { card } from "@/components/dashboard/ui";
import { requireSuperAdmin } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Bulk import" };

async function Sections() {
  await requireSuperAdmin();
  return (
    <>
      <ComedianImport />
      <ShowImport />
    </>
  );
}

/** Admin Bulk import: many comedians or shows at once from a filled template (CSV). */
export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">BULK IMPORT</h1>
        <p className="max-w-3xl text-radar-purple/80">
          Fill a template, save it as CSV (Excel: File &gt; Save As &gt; CSV UTF-8; Google Sheets: File &gt; Download &gt; CSV) and choose it below. You see a preview first: nothing is saved until you press Import. Import comedians first, so the shows can find them.
        </p>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Sections />
      </Suspense>
    </div>
  );
}
