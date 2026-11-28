import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { SocialImages } from "@/components/admin/social-images";
import { getSocialComedians } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Social images" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Content({ searchParams }: { searchParams: PageProps<"/admin/social">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const comedians = await getSocialComedians();
  const slug = one(sp.slug);
  const initial = comedians.some((c) => c.slug === slug) ? slug : "";
  return <SocialImages comedians={comedians} initialSlug={initial} />;
}

/** Social images (docs/social-templates.md): Instagram images made from the database. */
export default function AdminSocialPage({ searchParams }: PageProps<"/admin/social">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">SOCIAL IMAGES</h1>
        <p className="text-radar-purple/80">Pick a comedian to make the Comedian Feature post for Instagram (1080 × 1350).</p>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
