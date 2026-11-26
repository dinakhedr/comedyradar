import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { removeMember, resendInvite } from "@/app/actions/team";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, StatTile, Tag } from "@/components/dashboard/ui";
import { CloseIcon } from "@/components/icons";
import { CopyLink } from "@/components/profiles/claim-form";
import { EditAccessForm, InviteForm } from "@/components/team/team-forms";
import { pickProfile, profileKey } from "@/lib/dashboard";
import { getTeam, type TeamMember } from "@/lib/data/team";
import { ROLES } from "@/lib/team-forms";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Team and access" };

const iconBtn = "inline-flex h-11 w-11 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" });

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function Chips({ m }: { m: TeamMember }) {
  if (!m.chips.length) return <span className="text-sm text-radar-purple/70">No profiles yet</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {m.chips.map((c) => (
        <li key={c} className="rounded-full bg-lavender px-2.5 py-1 text-xs font-extrabold">
          {c}
        </li>
      ))}
    </ul>
  );
}

/** Remove (or cancel) needs a second tap: the first one opens a small confirm. */
function RemoveButton({ m, label }: { m: TeamMember; label: string }) {
  return (
    <details className="relative">
      <summary className={`${iconBtn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} aria-label={`${label} ${m.name ?? m.email}`} title={label}>
        <CloseIcon size={20} />
      </summary>
      <form action={removeMember} className="absolute right-0 z-10 mt-1 flex w-64 flex-col gap-2 rounded-card border border-radar-purple/15 bg-white p-3 shadow-lg">
        <input type="hidden" name="member_id" value={m.id} />
        <p className="text-sm">{m.status === "active" ? `${m.name ?? m.email} loses access at once. Their history stays.` : "The link stops working."}</p>
        <SubmitButton className={`${outlineBtn} min-h-10`}>{label}</SubmitButton>
      </form>
    </details>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard/team">["searchParams"] }) {
  const [sp, team, origin] = await Promise.all([searchParams, getTeam(), siteOrigin()]);
  const filter = pickProfile(team.profiles, sp.p);
  const sees = (m: TeamMember) =>
    !filter || (m.scope === "all" ? team.shareable.some((s) => s.id === filter.id) : m.access.some((a) => a.kind === filter.kind && a.id === filter.id));
  const members = team.members.filter(sees);
  const invites = team.invites.filter(sees);
  const open = team.invites.filter((i) => i.status === "invited").length;

  return (
    <>
      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatTile label="Team members" value={team.members.length} />
        <StatTile label="Profiles in the dashboard" value={team.profiles.length} />
        <StatTile label="Pending invitations" value={open} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="members" className={`${card} flex flex-col gap-4`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="members" className="text-heading font-extrabold">
                Team members
              </h2>
              {team.profiles.length > 1 && (
                <form method="get" action="/dashboard/team" className="flex items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="team-p" className={labelCls}>
                      Show access to
                    </label>
                    <select id="team-p" name="p" defaultValue={filter ? profileKey(filter) : ""} className={`${inputCls} min-h-11`}>
                      <option value="">All profiles</option>
                      {team.profiles.map((p) => (
                        <option key={profileKey(p)} value={profileKey(p)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className={outlineBtn}>
                    Show
                  </button>
                </form>
              )}
            </div>
            {members.length === 0 ? (
              <p className="text-base text-radar-purple/80">
                {filter ? `No one else has access to ${filter.name} through your team.` : "It's just you for now. Invite a manager, an agent or a friend to help with shows and tours."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-radar-purple/10">
                {members.map((m) => (
                  <li key={m.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="font-extrabold">
                          {m.name ?? m.email}
                          {m.name && <span className="block text-sm font-normal text-radar-purple/75">{m.email}</span>}
                        </p>
                        <Chips m={m} />
                        {m.accepted_at && <p className="text-xs text-radar-purple/70">Joined {day(m.accepted_at)}</p>}
                      </div>
                      <RemoveButton m={m} label="Remove" />
                    </div>
                    <details>
                      <summary className="min-h-11 cursor-pointer content-center text-sm font-extrabold underline">Edit access</summary>
                      <EditAccessForm member={m} shareable={team.shareable} />
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {invites.length > 0 && (
            <section aria-labelledby="invites" className={`${card} flex flex-col gap-4`}>
              <h2 id="invites" className="text-heading font-extrabold">
                Pending invitations
              </h2>
              <p className="-mt-2 text-sm text-radar-purple/75">Send each person their private link by WhatsApp or email. A link works for 7 days, only for the invited email.</p>
              <ul className="flex flex-col divide-y divide-radar-purple/10">
                {invites.map((m) => (
                  <li key={m.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="flex flex-wrap items-center gap-2 font-extrabold">
                          {m.email}
                          {m.status === "expired" ? <Tag tone="outline">Expired</Tag> : <Tag tone="pink">Waiting</Tag>}
                        </p>
                        <Chips m={m} />
                        <p className="text-xs text-radar-purple/70">
                          Sent {day(m.invited_at)} · {m.status === "expired" ? "expired" : "expires"} {day(m.expires_at)}
                        </p>
                      </div>
                      <form action={resendInvite}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <SubmitButton className={`${outlineBtn} min-h-11 px-3 text-sm`}>Send again</SubmitButton>
                      </form>
                      <RemoveButton m={m} label="Cancel invitation" />
                    </div>
                    {m.status === "invited" && m.token && <CopyLink url={`${origin}/team/invite/${m.token}`} label="Private invitation link" />}
                    <details>
                      <summary className="min-h-11 cursor-pointer content-center text-sm font-extrabold underline">Edit access</summary>
                      <EditAccessForm member={m} shareable={team.shareable} />
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="roles" className={`${card} flex flex-col gap-3`}>
            <h2 id="roles" className="text-heading font-extrabold">
              Admin or Moderator?
            </h2>
            <dl className="grid gap-3 md:grid-cols-2">
              {ROLES.map((r) => (
                <div key={r.value} className="rounded-button bg-lavender p-3">
                  <dt className="font-extrabold">{r.label}</dt>
                  <dd className="text-sm">{r.help}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-radar-purple/75">A profile always keeps at least one admin. Removed people lose access at once; what they did stays in the history.</p>
          </section>
        </div>

        <aside aria-labelledby="invite" className={`${card} flex flex-col gap-4 xl:sticky xl:top-6`}>
          <h2 id="invite" className="text-heading font-extrabold">
            Invite someone
          </h2>
          {team.shareable.length === 0 ? (
            <p className="text-base text-radar-purple/80">
              You can invite people to the profiles where you are Admin. You don&apos;t have any yet.{" "}
              <Link href="/dashboard/profiles/new" className="font-extrabold underline">
                Create or claim a profile
              </Link>
              .
            </p>
          ) : (
            <InviteForm shareable={team.shareable} />
          )}
        </aside>
      </div>
    </>
  );
}

/** Team and access (spec 11.4 item 6). */
export default function TeamPage({ searchParams }: PageProps<"/dashboard/team">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">TEAM AND ACCESS</h1>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
