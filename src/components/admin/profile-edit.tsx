import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { card, Tag } from "@/components/dashboard/ui";
import { ProfileEditForm } from "@/components/profiles/edit-forms";
import { Members, Podcasts } from "@/components/profiles/edit-sections";
import { deleteProfile } from "@/app/actions/admin-profiles";
import { getDeleteImpact, requireSuperAdmin } from "@/lib/data/admin";
import { getProfileForSuperAdmin } from "@/lib/data/profile-edit";
import { getCountries } from "@/lib/data/profiles";
import { UUID } from "@/lib/profile-server";
import { adminListPath } from "@/lib/admin-paths";
import { StatusPill } from "@/components/status";
import { SubmitButton } from "@/components/submit-button";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Delete for good, with what goes with it and an "I understand" tick. */
async function DeleteSection({ kind, id, msg }: { kind: "comedian" | "group"; id: string; msg: string }) {
  const impact = await getDeleteImpact(kind, id);
  if (!impact) return null;
  const what = kind === "group" ? "group" : "comedian";
  const goes = [
    impact.solo_shows ? `${plural(impact.solo_shows, "show", "shows")} where ${impact.name} is the only performer` : "",
    impact.tours ? plural(impact.tours, "tour", "tours") : "",
    impact.solo_podcasts ? `${plural(impact.solo_podcasts, "podcast", "podcasts")} where ${impact.name} is the only host` : "",
  ].filter(Boolean);
  return (
    <section id="delete" aria-labelledby="delete-h" className={`${card} flex scroll-mt-6 flex-col gap-3 border-2 border-[#d12a1f]/40`}>
      <h2 id="delete-h" className="text-heading font-extrabold">
        Delete this {what}
      </h2>
      <ul className="list-disc pl-5 text-sm">
        <li>The {what} page, photo and links are removed for good.</li>
        <li>{goes.length ? `Also deleted: ${goes.join(", ")}.` : "No shows, tours or podcasts are deleted with it."}</li>
        {impact.shared_shows > 0 && <li>{impact.name} is taken off the lineup of {plural(impact.shared_shows, "other show", "other shows")}. Those shows stay.</li>}
        <li>Anyone with access to it loses it.</li>
      </ul>
      <p className="text-sm text-radar-purple/80">This can&apos;t be undone. To only hide the {what}, set its Status to Archived in the side panel of the list instead.</p>
      <form action={deleteProfile} className="flex flex-col gap-3">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <label className="flex min-h-11 items-start gap-3 text-sm font-bold">
          <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#d12a1f]" />
          I understand that {impact.name} will be deleted for good.
        </label>
        {msg === "confirm" && <p className="text-sm font-bold text-[#d12a1f]">Please tick the box first.</p>}
        {msg === "error" && <p className="text-sm font-bold text-[#d12a1f]">We couldn&apos;t delete it. Please try again.</p>}
        <SubmitButton className="inline-flex min-h-11 items-center justify-center self-start rounded-button bg-[#d12a1f] px-5 text-[15px] font-extrabold text-white hover:bg-[#b0231a]">
          Delete {what}
        </SubmitButton>
      </form>
    </section>
  );
}

const STATUS = { published: "Published", pending: "Pending", draft: "Draft", archived: "Archived" } as const;

type SP = Record<string, string | string[] | undefined>;

async function Content({ kind, params, searchParams }: { kind: "comedian" | "group"; params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireSuperAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const msg = typeof sp.msg === "string" ? sp.msg : "";
  if (!UUID.test(id)) notFound();
  const p = await getProfileForSuperAdmin(kind, id);
  if (!p) notFound();
  const countries = await getCountries();
  const back = `${adminListPath(p.kind)}?p=${p.kind}:${p.id}`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href={back} className="text-sm font-extrabold underline">
          Back to {p.kind === "group" ? "Groups" : "Comedians"}
        </Link>
        <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Edit {p.kind === "group" ? "group" : "comedian"}</p>
        <h1 className="font-display text-[32px] leading-none break-words md:text-[44px]">{p.name.toUpperCase()}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <StatusPill status={p.status} label={STATUS[p.status]} />
          {p.verified && <Tag tone="purple">Verified</Tag>}
          {p.status === "published" && (
            <Link href={`/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}`} className="font-extrabold underline">
              View the public page
            </Link>
          )}
        </p>
        <p className="max-w-3xl text-sm text-radar-purple/80">
          As super admin you can change any profile, claimed or not, and name changes save straight away. Delete is at the bottom. You don&apos;t become an admin of the profile. Status, Verified and Access stay in the side panel of the list.
        </p>
      </div>
      <div className="flex max-w-4xl min-w-0 flex-col gap-6">
        <ProfileEditForm p={p} countries={countries} />
        {p.kind === "group" ? <Members p={p} /> : <Podcasts p={p} />}
        <DeleteSection kind={p.kind} id={p.id} msg={msg} />
      </div>
    </>
  );
}

/** Admin > Comedians or Groups > Edit: the super admin edits any comedian or group. */
export function AdminProfileEdit({ kind, params, searchParams }: { kind: "comedian" | "group"; params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content kind={kind} params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
