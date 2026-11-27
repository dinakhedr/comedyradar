import Link from "next/link";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { CreateProfileForm } from "@/components/profiles/create-form";
import { adminListPath } from "@/lib/admin-paths";
import { requireSuperAdmin } from "@/lib/data/admin";
import { getCountries } from "@/lib/data/profiles";

async function Form({ kind }: { kind: "comedian" | "group" }) {
  const [, countries] = await Promise.all([requireSuperAdmin(), getCountries()]);
  return <CreateProfileForm kind={kind} countries={countries} admin />;
}

/** Admin > Comedians or Groups > Add new: the creator form, with a status and no claim step. */
export function AdminNewProfile({ kind }: { kind: "comedian" | "group" }) {
  const group = kind === "group";
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href={adminListPath(kind)} className="text-sm font-extrabold underline">
          Back to {group ? "Groups" : "Comedians"}
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">{group ? "ADD NEW GROUP" : "ADD NEW COMEDIAN"}</h1>
        <p className="text-base text-radar-purple/80">
          It is marked &ldquo;seeded by Comedy Radar&rdquo;. You do not become its admin, so its owner can claim it later.
        </p>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Form kind={kind} />
      </Suspense>
    </div>
  );
}
