import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { changeAccess, grantAccess, setProfileStatus } from "@/app/actions/admin-profiles";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, StatTile, Tag, yellowBtn } from "@/components/dashboard/ui";
import { CloseIcon, EditIcon, ExternalIcon, SaveIcon } from "@/components/icons";
import { adminEditPath, adminListPath } from "@/lib/admin-paths";
import { getAdminProfileAccess, getAdminProfiles, type AdminProfileRow } from "@/lib/data/admin";
import { ErrorNote, SuccessNote } from "@/components/status-note";
import { StatusPill } from "@/components/status";
import { SubmitButton } from "@/components/submit-button";
import { LinkPending } from "@/components/link-pending";
import { AddNewLink } from "@/components/admin/add-new-link";
import { LETTERS, nameLetter, usedLetters } from "@/lib/comedians-filters";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
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
  created: "Added.",
  deleted: "Profile deleted.",
  added: "Access added.",
  no_account: "Nobody has signed up with that email yet. Ask them to create an account first.",
  error: "Something went wrong. Please try again.",
};
const iconBtn = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const smallSelect = "min-h-11 rounded-button border-2 border-radar-purple/25 bg-white px-2 text-sm font-bold";
type Kind = "comedian" | "group";
const pageOf = (p: AdminProfileRow) => `/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}`;


function statusTag(p: AdminProfileRow) {
  return <StatusPill status={p.status} />;
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
        <Link href={adminEditPath(p.kind, p.id)} className={iconBtn} aria-label={`Edit ${p.name}`} title="Edit">
          <LinkPending><EditIcon /></LinkPending>
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
        <SubmitButton className={`${yellowBtn} h-11 w-11 self-start px-0!`} aria-label="Save status" title="Save status">
          <SaveIcon />
        </SubmitButton>
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
                  <SubmitButton className={`${outlineBtn} h-11 w-11 shrink-0 px-0!`} aria-label="Save role" title="Save role">
                    <SaveIcon />
                  </SubmitButton>
                </form>
                <form action={changeAccess}>
                  <input type="hidden" name="access_id" value={a.id} />
                  <input type="hidden" name="ret" value={ret} />
                  <input type="hidden" name="role" value="remove" />
                  <SubmitButton className={iconBtn} aria-label={`Remove ${a.name ?? a.email}`} title="Remove access">
                    <CloseIcon size={20} />
                  </SubmitButton>
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
            <SubmitButton className={`${outlineBtn} ml-auto`}>Add</SubmitButton>
          </div>
          <p className="text-xs text-radar-purple/70">They need a Comedy Radar account with this email. It works at once, with no invitation.</p>
        </form>
      </section>
    </aside>
  );
}

type SP = Record<string, string | string[] | undefined>;

async function Content({ kind, searchParams }: { kind: Kind; searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const base = adminListPath(kind);
  const q = one(sp.q).slice(0, 80);
  const status = STATUSES.some((s) => s.value === one(sp.status)) ? one(sp.status) : "";
  const verified = VERIFIED.some((v) => v.value === one(sp.verified)) ? one(sp.verified) : "";
  // A–Z bar on Comedians, like the public Comedians page.
  const letter = kind === "comedian" && LETTERS.includes(one(sp.letter)) ? one(sp.letter) : "";
  // The numbers count only this kind, whatever the filters say.
  const [data, pendingAll, noAdminAll] = await Promise.all([
    getAdminProfiles({ kind, q, status, verified }),
    getAdminProfiles({ kind, q: "", status: "pending", verified: "" }),
    getAdminProfiles({ kind, q: "", status: "", verified: "no_admin" }),
  ]);
  const total = kind === "group" ? data.stats.groups : data.stats.comedians;
  const noAdmin = noAdminAll.rows.filter((r) => r.status !== "archived").length;
  const letters = usedLetters(data.rows);
  const rows = letter ? data.rows.filter((r) => nameLetter(r.name) === letter) : data.rows;
  const picked = data.rows.find((r) => `${r.kind}:${r.id}` === one(sp.p)) ?? null;
  const msg = MSG[one(sp.msg)];

  const link = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    const all = { q, status, verified, letter, ...over };
    for (const [k, v] of Object.entries(all)) if (v) u.set(k, v);
    const qs = u.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const ret = link(picked ? { p: `${picked.kind}:${picked.id}` } : {});
  const filtered = q || status || verified || letter;
  const noun = kind === "group" ? "groups" : "comedians";

  return (
    <>
      {msg && (
        ["saved", "created", "deleted", "added"].includes(one(sp.msg)) ? (
          <SuccessNote>{msg}</SuccessNote>
        ) : (
          <ErrorNote>{msg}</ErrorNote>
        )
      )}
      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatTile label={kind === "group" ? "Groups" : "Comedians"} value={total} />
        <StatTile label="No admin yet" value={noAdmin} />
        <StatTile label="Pending review" value={pendingAll.rows.length} />
      </section>

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${picked ? "xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start" : ""}`}>
        <section aria-labelledby="list" className={`${card} flex min-w-0 flex-col gap-4`}>
          <h2 id="list" className="sr-only">
            {kind === "group" ? "Groups" : "Comedians"}
          </h2>
          <form method="get" action={base} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            {letter && <input type="hidden" name="letter" value={letter} />}
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
                <Link href={link({ q: "", status: "", verified: "", letter: "" })} className={`${outlineBtn} border-transparent`}>
                  Clear
                </Link>
              )}
            </div>
          </form>

          {kind === "comedian" && (
            <nav aria-label="Jump to letter" className="-mx-1 flex flex-nowrap items-center gap-0.5 overflow-x-auto px-1 pb-1">
              <span className="w-10 shrink-0 text-[13px] font-extrabold tracking-[1px] text-radar-purple/70">A–Z</span>
              <Link
                href={link({ letter: "" })}
                scroll={false}
                aria-current={!letter ? "true" : undefined}
                className={`inline-flex h-11 shrink-0 items-center rounded-[10px] px-2 text-sm font-extrabold ${!letter ? "bg-spotlight-yellow" : "hover:bg-lavender"}`}
              >
                All
              </Link>
              {LETTERS.map((l) =>
                letters.has(l) || l === letter ? (
                  <Link
                    key={l}
                    href={link({ letter: l })}
                    scroll={false}
                    aria-current={letter === l ? "true" : undefined}
                    className={`inline-flex h-11 min-w-7 flex-1 shrink-0 items-center justify-center rounded-[10px] text-sm font-extrabold ${letter === l ? "bg-spotlight-yellow" : "hover:bg-lavender"}`}
                  >
                    {l}
                  </Link>
                ) : (
                  <span key={l} aria-hidden="true" className="inline-flex h-11 min-w-7 flex-1 shrink-0 items-center justify-center text-sm font-bold text-radar-purple/30">
                    {l}
                  </span>
                ),
              )}
            </nav>
          )}

          {rows.length === 0 ? (
            <p className="text-radar-purple/80">{filtered ? `No ${noun} match these filters.` : `No ${noun} yet.`}</p>
          ) : (
            <div className="relative -mx-4 overflow-x-auto md:mx-0">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                    <th className="px-4 py-2 font-extrabold md:px-2">Profile</th>
                    <th className="px-2 py-2 font-extrabold">Status</th>
                    <th className="px-2 py-2 text-right font-extrabold">Admins</th>
                    <th className="px-2 py-2 text-right font-extrabold">Upcoming</th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
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
                        <td className="px-2 py-2">{statusTag(r)}</td>
                        <td className={`px-2 py-2 text-right font-bold ${r.admins === 0 ? "text-laugh-pink-deep" : ""}`}>{r.admins}</td>
                        <td className="px-2 py-2 text-right">{r.upcoming}</td>
                        <td className="px-2 py-1 text-right">
                          <Link href={adminEditPath(r.kind, r.id)} className={iconBtn} aria-label={`Edit ${r.name}`} title="Edit">
                            <LinkPending><EditIcon /></LinkPending>
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

/**
 * Admin Comedians and Admin Groups (spec 11.5 item 3, Profiles split into two
 * pages): the list with filters, and a side panel for status and access.
 */
export function AdminProfilesList({ kind, searchParams }: { kind: Kind; searchParams: Promise<SP> }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">{kind === "group" ? "GROUPS" : "COMEDIANS"}</h1>
        <AddNewLink href={`${adminListPath(kind)}/new`}>{kind === "group" ? "Add new group" : "Add new comedian"}</AddNewLink>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content kind={kind} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
