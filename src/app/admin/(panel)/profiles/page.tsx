import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { changeAccess, grantAccess, setProfileStatus } from "@/app/actions/admin-profiles";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, StatTile, Tag, yellowBtn } from "@/components/dashboard/ui";
import { CloseIcon, EditIcon, ExternalIcon, SaveIcon } from "@/components/icons";
import { getAdminProfileAccess, getAdminProfiles, type AdminProfileRow } from "@/lib/data/admin";
import { ErrorNote, SuccessNote } from "@/components/status-note";

export const metadata: Metadata = { title: "Profiles" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const KIND_TABS = [
  { value: "all", label: "All" },
  { value: "comedian", label: "Comedians" },
  { value: "group", label: "Groups" },
] as const;
const STATUSES = [
  { value: "published", label: "Published" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];
const VERIFIED = [
  { value: "verified", label: "Verified" },
  { value: "not_verified", label: "Not verified" },
  { value: "no_admin", label: "No admin" },
];
const MSG: Record<string, string> = {
  saved: "Saved.",
  deleted: "Profile deleted.",
  added: "Access added.",
  no_account: "Nobody has signed up with that email yet. Ask them to create an account first.",
  error: "Something went wrong. Please try again.",
};
const iconBtn = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const smallSelect = "min-h-11 rounded-button border-2 border-radar-purple/25 bg-white px-2 text-sm font-bold";
const pageOf = (p: AdminProfileRow) => `/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}`;

function statusTag(p: AdminProfileRow) {
  if (p.status === "published") return <Tag tone="yellow">Published</Tag>;
  if (p.status === "pending") return <Tag tone="pink">Pending</Tag>;
  return <Tag tone="outline">{p.status === "draft" ? "Draft" : "Archived"}</Tag>;
}

async function SidePanel({ p, ret, close }: { p: AdminProfileRow; ret: string; close: string }) {
  const access = await getAdminProfileAccess(p.kind, p.id);
  return (
    <aside aria-labelledby="panel" className={`${card} flex min-w-0 flex-col gap-5 xl:sticky xl:top-6`}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="panel" className="text-heading font-extrabold break-words">
            {p.name}
          </h2>
          {p.name_ar && (
            <p dir="rtl" lang="ar" className="text-left text-sm text-radar-purple/75">
              {p.name_ar}
            </p>
          )}
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {p.kind === "group" ? "Group" : "Comedian"} {statusTag(p)} {p.verified && <Tag tone="purple">Verified</Tag>}
          </p>
        </div>
        <Link href={`/admin/profiles/edit/${p.kind}/${p.id}`} className={iconBtn} aria-label={`Edit ${p.name}`} title="Edit">
          <EditIcon />
        </Link>
        {p.status === "published" && (
          <a href={pageOf(p)} target="_blank" rel="noreferrer" className={iconBtn} aria-label="View the public page" title="View the public page">
            <ExternalIcon />
          </a>
        )}
        <Link href={close} className={iconBtn} aria-label="Close" title="Close">
          <CloseIcon size={20} />
        </Link>
      </div>

      <form action={setProfileStatus} className="flex flex-col gap-3 rounded-button bg-lavender p-3">
        <input type="hidden" name="kind" value={p.kind} />
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="ret" value={ret} />
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="verified" value="yes" defaultChecked={p.verified} className="h-5 w-5 accent-radar-purple" />
          Verified
        </label>
        <div className="flex flex-col gap-1">
          <label htmlFor="p-status" className={labelCls}>
            Status
          </label>
          <select id="p-status" name="status" defaultValue={p.status} className={`${inputCls} min-h-11`}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-radar-purple/70">Archived hides the profile everywhere. Nothing is deleted.</p>
        </div>
        <button className={`${yellowBtn} h-11 w-11 self-start px-0!`} aria-label="Save status" title="Save status">
          <SaveIcon />
        </button>
      </form>

      <section aria-labelledby="access" className="flex flex-col gap-2">
        <h3 id="access" className="font-extrabold">
          Access
        </h3>
        {access.length === 0 ? (
          <p className="text-sm text-radar-purple/75">Nobody manages this profile yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-radar-purple/10">
            {access.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold break-words">{a.name ?? a.email}</span>
                  <span className="block text-xs break-all text-radar-purple/70">
                    {a.email}
                    {a.via_team ? " · through a team" : ""}
                  </span>
                </span>
                <form action={changeAccess} className="flex items-center gap-1">
                  <input type="hidden" name="access_id" value={a.id} />
                  <input type="hidden" name="ret" value={ret} />
                  <label htmlFor={`role-${a.id}`} className="sr-only">
                    Role for {a.name ?? a.email}
                  </label>
                  <select id={`role-${a.id}`} name="role" defaultValue={a.role} className={smallSelect}>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                  <button className={`${outlineBtn} h-11 w-11 shrink-0 px-0!`} aria-label="Save role" title="Save role">
                    <SaveIcon />
                  </button>
                </form>
                <form action={changeAccess}>
                  <input type="hidden" name="access_id" value={a.id} />
                  <input type="hidden" name="ret" value={ret} />
                  <input type="hidden" name="role" value="remove" />
                  <button className={iconBtn} aria-label={`Remove ${a.name ?? a.email}`} title="Remove access">
                    <CloseIcon size={20} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={grantAccess} className="flex flex-col gap-2 rounded-button border-2 border-radar-purple/15 p-3">
          <input type="hidden" name="kind" value={p.kind} />
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="ret" value={ret} />
          <label htmlFor="grant-email" className={labelCls}>
            Add a person by email
          </label>
          <input id="grant-email" name="email" type="email" required maxLength={200} autoComplete="off" className={inputCls} />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="grant-role" className="text-sm font-bold">
              Role
            </label>
            <select id="grant-role" name="role" defaultValue="admin" className={smallSelect}>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
            <button className={`${outlineBtn} ml-auto`}>Add</button>
          </div>
          <p className="text-xs text-radar-purple/70">They need a Comedy Radar account with this email. It works at once, with no invitation.</p>
        </form>
      </section>
    </aside>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/profiles">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const kind = KIND_TABS.some((t) => t.value === one(sp.kind)) ? one(sp.kind) : "all";
  const q = one(sp.q).slice(0, 80);
  const status = STATUSES.some((s) => s.value === one(sp.status)) ? one(sp.status) : "";
  const verified = VERIFIED.some((v) => v.value === one(sp.verified)) ? one(sp.verified) : "";
  const data = await getAdminProfiles({ kind, q, status, verified });
  const picked = data.rows.find((r) => `${r.kind}:${r.id}` === one(sp.p)) ?? null;
  const msg = MSG[one(sp.msg)];

  const link = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    const all = { kind, q, status, verified, ...over };
    for (const [k, v] of Object.entries(all)) if (v && !(k === "kind" && v === "all")) u.set(k, v);
    const qs = u.toString();
    return qs ? `/admin/profiles?${qs}` : "/admin/profiles";
  };
  const ret = link(picked ? { p: `${picked.kind}:${picked.id}` } : {});
  const filtered = q || status || verified;

  return (
    <>
      {msg && (
        ["saved", "deleted", "added"].includes(one(sp.msg)) ? (
          <SuccessNote>{msg}</SuccessNote>
        ) : (
          <ErrorNote>{msg}</ErrorNote>
        )
      )}
      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Comedians" value={data.stats.comedians} />
        <StatTile label="Groups" value={data.stats.groups} />
        <StatTile label="No admin yet" value={data.stats.no_admin} />
        <StatTile label="Pending review" value={data.stats.pending} />
      </section>

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${picked ? "xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start" : ""}`}>
        <section aria-labelledby="list" className={`${card} flex min-w-0 flex-col gap-4`}>
          <h2 id="list" className="sr-only">
            Profiles
          </h2>
          <nav aria-label="Profile types" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {KIND_TABS.map((t) => {
              const active = t.value === kind;
              return (
                <Link
                  key={t.value}
                  href={link({ kind: t.value })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-button px-3 text-[15px] font-extrabold ${active ? "bg-stage-black text-white" : "hover:bg-lavender"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <form method="get" action="/admin/profiles" className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
            <div className="flex flex-col gap-1">
              <label htmlFor="ap-q" className={labelCls}>
                Search
              </label>
              <input id="ap-q" name="q" defaultValue={q} placeholder="English or Arabic name" className={`${inputCls} min-h-11`} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ap-status" className={labelCls}>
                Status
              </label>
              <select id="ap-status" name="status" defaultValue={status} className={`${inputCls} min-h-11`}>
                <option value="">Any status</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ap-verified" className={labelCls}>
                Verification
              </label>
              <select id="ap-verified" name="verified" defaultValue={verified} className={`${inputCls} min-h-11`}>
                <option value="">Any</option>
                {VERIFIED.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={outlineBtn}>
                Show
              </button>
              {filtered && (
                <Link href={link({ q: "", status: "", verified: "" })} className={`${outlineBtn} border-transparent`}>
                  Clear
                </Link>
              )}
            </div>
          </form>

          {data.rows.length === 0 ? (
            <p className="text-radar-purple/80">{filtered ? "No profiles match these filters." : "No profiles yet."}</p>
          ) : (
            <div className="relative -mx-4 overflow-x-auto md:mx-0">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                    <th className="px-4 py-2 font-extrabold md:px-2">Profile</th>
                    <th className="px-2 py-2 font-extrabold">Type</th>
                    <th className="px-2 py-2 font-extrabold">Status</th>
                    <th className="px-2 py-2 text-right font-extrabold">Admins</th>
                    <th className="px-2 py-2 text-right font-extrabold">Upcoming</th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => {
                    const on = picked?.id === r.id;
                    return (
                      <tr key={`${r.kind}-${r.id}`} className={`border-b border-radar-purple/10 ${on ? "bg-lavender" : ""}`}>
                        <td className="px-4 py-2 md:px-2">
                          <Link href={link({ p: `${r.kind}:${r.id}` })} className="font-extrabold hover:underline">
                            {r.name}
                          </Link>
                          {r.verified && (
                            <span className="ml-1.5 align-middle">
                              <Tag tone="purple">Verified</Tag>
                            </span>
                          )}
                          {r.name_ar && (
                            <span dir="rtl" lang="ar" className="block text-xs text-radar-purple/70">
                              {r.name_ar}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">{r.kind === "group" ? "Group" : "Comedian"}</td>
                        <td className="px-2 py-2">{statusTag(r)}</td>
                        <td className={`px-2 py-2 text-right font-bold ${r.admins === 0 ? "text-laugh-pink-deep" : ""}`}>{r.admins}</td>
                        <td className="px-2 py-2 text-right">{r.upcoming}</td>
                        <td className="px-2 py-1 text-right">
                          <Link href={`/admin/profiles/edit/${r.kind}/${r.id}`} className={iconBtn} aria-label={`Edit ${r.name}`} title="Edit">
                            <EditIcon />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data.rows.length >= 300 && <p className="text-sm text-radar-purple/75">Showing the first 300. Search to narrow the list.</p>}
        </section>
        {picked && <SidePanel key={`${picked.kind}-${picked.id}`} p={picked} ret={ret} close={link({})} />}
      </div>
    </>
  );
}

/** Admin Profiles (spec 11.5 item 3). */
export default function AdminProfilesPage({ searchParams }: PageProps<"/admin/profiles">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">PROFILES</h1>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
