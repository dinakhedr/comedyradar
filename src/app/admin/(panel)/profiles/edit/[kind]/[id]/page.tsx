import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { card, Tag } from "@/components/dashboard/ui";
import { ProfileEditForm } from "@/components/profiles/edit-forms";
import { Members, Podcasts } from "@/components/profiles/edit-sections";
import { requireSuperAdmin } from "@/lib/data/admin";
import { getProfileForSuperAdmin } from "@/lib/data/profile-edit";
import { getCountries } from "@/lib/data/profiles";
import { UUID } from "@/lib/profile-server";

export const metadata: Metadata = { title: "Edit profile" };

const STATUS = { published: "Published", pending: "Pending", draft: "Draft", archived: "Archived" } as const;

async function Content({ params }: { params: PageProps<"/admin/profiles/edit/[kind]/[id]">["params"] }) {
  await requireSuperAdmin();
  const { kind, id } = await params;
  if ((kind !== "comedian" && kind !== "group") || !UUID.test(id)) notFound();
  const p = await getProfileForSuperAdmin(kind, id);
  if (!p) notFound();
  const countries = await getCountries();
  const back = `/admin/profiles?p=${p.kind}:${p.id}`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href={back} className="text-sm font-extrabold underline">
          Back to Profiles
        </Link>
        <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Edit {p.kind === "group" ? "group" : "comedian"}</p>
        <h1 className="font-display text-[32px] leading-none break-words md:text-[44px]">{p.name.toUpperCase()}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Tag tone={p.status === "published" ? "yellow" : p.status === "pending" ? "pink" : "outline"}>{STATUS[p.status]}</Tag>
          {p.verified && <Tag tone="purple">Verified</Tag>}
          {p.status === "published" && (
            <Link href={`/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}`} className="font-extrabold underline">
              View the public page
            </Link>
          )}
        </p>
        <p className="max-w-3xl text-sm text-radar-purple/80">
          As super admin you can change any profile, claimed or not, and name changes save straight away. You don&apos;t become an admin of the profile. Status, Verified and Access stay in the Profiles side panel.
        </p>
      </div>
      <div className="flex max-w-4xl min-w-0 flex-col gap-6">
        <ProfileEditForm p={p} countries={countries} />
        {p.kind === "group" ? <Members p={p} /> : <Podcasts p={p} />}
      </div>
    </>
  );
}

/** Admin > Profiles > Edit: the super admin edits any comedian or group. */
export default function AdminEditProfilePage({ params }: PageProps<"/admin/profiles/edit/[kind]/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
