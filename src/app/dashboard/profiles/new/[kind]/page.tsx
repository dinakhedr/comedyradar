import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { CreateProfileForm } from "@/components/profiles/create-form";
import { requireAccount } from "@/lib/data/dashboard";
import { getCountries } from "@/lib/data/profiles";
import { ErrorNote } from "@/components/status-note";

export function generateStaticParams() {
  return [{ kind: "comedian" }, { kind: "group" }];
}

export async function generateMetadata({ params }: PageProps<"/dashboard/profiles/new/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return { title: kind === "group" ? "New group profile" : "New comedian profile" };
}

async function Form({ kind }: { kind: "comedian" | "group" }) {
  const [account, countries] = await Promise.all([requireAccount(), getCountries()]);
  if (account.is_suspended) {
    return (
      <ErrorNote stay>This account is suspended. Please contact comedyradarnetwork@gmail.com.</ErrorNote>
    );
  }
  return <CreateProfileForm kind={kind} countries={countries} />;
}

/** Create a new comedian or group profile (spec 11.4 item 2). */
export default async function NewProfileKindPage({ params }: PageProps<"/dashboard/profiles/new/[kind]">) {
  const { kind } = await params;
  if (kind !== "comedian" && kind !== "group") notFound();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/dashboard/profiles/new" className="text-sm font-extrabold underline">
          Back to search
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">{kind === "group" ? "NEW GROUP" : "NEW COMEDIAN"}</h1>
        <p className="text-base text-radar-purple/80">
          {kind === "group"
            ? "Add your group's page. You will be its admin and can invite your team later."
            : "Add your comedian page. You will be its admin and can invite a manager later."}
        </p>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Form kind={kind} />
      </Suspense>
    </div>
  );
}
