import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { answerLinkRequest, cancelLinkRequest } from "@/app/actions/requests";
import { removeMember } from "@/app/actions/team";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, StatTile, Tag, yellowBtn } from "@/components/dashboard/ui";
import { CloseIcon, ExternalIcon } from "@/components/icons";
import { AnswerForm } from "@/components/team/team-forms";
import { ROLE_LABELS } from "@/lib/dashboard";
import { formatShowDate } from "@/lib/dates";
import { getRequests, type IncomingInvite, type SentInvite } from "@/lib/data/requests";
import { describe, kindOf, REQUEST_KINDS, REQUEST_TABS, requestKind, requestTab, tabOf, TYPE_LABEL, type LinkRequest, type RequestKind, type RequestTab } from "@/lib/requests";
import { SuccessNote } from "@/components/status-note";
import { StatusPill } from "@/components/status";

export const metadata: Metadata = { title: "Requests" };

const iconBtn = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const DONE: Record<string, string> = {
  accepted: "Accepted. The link now shows on the public pages.",
  declined: "Declined. Nothing changes on the public pages.",
  cancelled: "Request cancelled.",
  gone: "This request was already answered or cancelled.",
};

/** Where the request points: the show, group or podcast, and the comedian. */
function Details({ r }: { r: LinkRequest }) {
  const parts: string[] = [];
  if (r.type === "lineup_tag" && r.show_starts_at) parts.push(formatShowDate(new Date(r.show_starts_at)));
  if (r.type === "lineup_tag" && r.show_city) parts.push(r.show_city);
  parts.push(r.status === "pending" ? `Sent ${day(r.created_at)}` : `${r.status === "accepted" ? "Accepted" : "Declined"} ${day(r.decided_at ?? r.created_at)}`);
  return <p className="text-xs text-radar-purple/70">{parts.join(" · ")}</p>;
}

function LinkCard({ r }: { r: LinkRequest }) {
  const tab = tabOf(r);
  const page = r.type === "lineup_tag" && r.show_slug ? `/shows/${r.show_slug}` : r.type === "group_member" && r.group_slug ? `/groups/${r.group_slug}` : null;
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-2">
          <Tag tone="outline">{TYPE_LABEL[r.type]}</Tag>
          {tab === "history" && <StatusPill status={r.status === "accepted" ? "accepted" : "declined"} label={r.status === "accepted" ? "Accepted" : "Declined"} />}
          {tab === "history" && <span className="text-xs font-bold text-radar-purple/70">{r.direction === "incoming" ? "To you" : "Sent by you"}</span>}
        </p>
        <p className="font-bold">{describe(r)}</p>
        <Details r={r} />
      </div>
      <div className="flex items-center gap-2">
        {page && (
          <a href={page} target="_blank" rel="noreferrer" className={iconBtn} aria-label="Open the public page (only if it is published)" title="Open the public page">
            <ExternalIcon />
          </a>
        )}
        {tab === "incoming" && (
          <form action={answerLinkRequest} className="flex gap-2">
            <input type="hidden" name="request_id" value={r.id} />
            <button name="answer" value="accept" className={`${yellowBtn} px-5`}>
              Accept
            </button>
            <button name="answer" value="decline" className={outlineBtn}>
              Decline
            </button>
          </form>
        )}
        {tab === "sent" && (
          <form action={cancelLinkRequest}>
            <input type="hidden" name="request_id" value={r.id} />
            <button className={iconBtn} aria-label={`Cancel: ${describe(r)}`} title="Cancel request">
              <CloseIcon size={20} />
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

function InviteCard({ i }: { i: IncomingInvite }) {
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-1.5">
        <p>
          <Tag tone="outline">Team invite</Tag>
        </p>
        <p className="font-bold">
          {i.owner_name} invited you to their team: {i.scope === "all" ? `all their profiles, as ${ROLE_LABELS[i.all_role ?? "moderator"]}` : "selected profiles"}.
        </p>
        <p className="text-xs text-radar-purple/70">
          Sent {day(i.invited_at)} · expires {day(i.expires_at)} ·{" "}
          <Link href={`/team/invite/${i.token}`} className="font-extrabold underline">
            See the details
          </Link>
        </p>
      </div>
      <AnswerForm token={i.token} />
    </li>
  );
}

function SentInviteCard({ m }: { m: SentInvite }) {
  return (
    <li className="flex items-start gap-3 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-2">
          <Tag tone="outline">Team invite</Tag>
          {m.status === "expired" && <StatusPill status="expired" label="Expired" />}
        </p>
        <p className="font-bold break-words">You invited {m.invite_email} to your team.</p>
        <p className="text-xs text-radar-purple/70">
          Sent {day(m.invited_at)} · {m.status === "expired" ? "expired" : "expires"} {day(m.expires_at)} ·{" "}
          <Link href="/dashboard/team" className="font-extrabold underline">
            Team and access
          </Link>
        </p>
      </div>
      <form action={removeMember}>
        <input type="hidden" name="member_id" value={m.id} />
        <button className={iconBtn} aria-label={`Cancel the invitation to ${m.invite_email}`} title="Cancel invitation">
          <CloseIcon size={20} />
        </button>
      </form>
    </li>
  );
}

const EMPTY: Record<RequestTab, string> = {
  incoming: "Nothing waiting for your answer. When someone tags your profile in a lineup, a group or a podcast, or invites you to a team, it shows up here.",
  sent: "Nothing waiting. When you tag a profile you don't manage, the request waits here until its admin answers.",
  history: "Answered requests show up here.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard/requests">["searchParams"] }) {
  const sp = await searchParams;
  const tab = requestTab(one(sp.tab));
  const kind = requestKind(one(sp.type));
  const done = DONE[one(sp.done) ?? ""];
  const { links, incomingInvites, sentInvites } = await getRequests();

  const show = (k: RequestKind) => !kind || kind === k;
  const inTab = (t: RequestTab) => links.filter((r) => tabOf(r) === t);
  const counts: Record<RequestTab, number> = {
    incoming: inTab("incoming").length + incomingInvites.length,
    sent: inTab("sent").length + sentInvites.length,
    history: inTab("history").length,
  };
  const list = inTab(tab).filter((r) => show(kindOf(r.type)));
  const invitesIn = tab === "incoming" && show("team") ? incomingInvites : [];
  const invitesOut = tab === "sent" && show("team") ? sentInvites : [];
  const empty = list.length + invitesIn.length + invitesOut.length === 0;
  const hrefFor = (t: RequestTab) => {
    const u = new URLSearchParams();
    if (t !== "incoming") u.set("tab", t);
    if (kind) u.set("type", kind);
    const q = u.toString();
    return q ? `/dashboard/requests?${q}` : "/dashboard/requests";
  };

  return (
    <>
      {done && (
        <SuccessNote>{done}</SuccessNote>
      )}
      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatTile label="Waiting for you" value={counts.incoming} />
        <StatTile label="Sent, waiting" value={counts.sent} />
        <StatTile label="Answered" value={counts.history} />
      </section>

      <section aria-labelledby="list" className={`${card} flex flex-col gap-4`}>
        <h2 id="list" className="sr-only">
          Requests
        </h2>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <nav aria-label="Request tabs" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {REQUEST_TABS.map((t) => {
              const active = t.value === tab;
              return (
                <Link
                  key={t.value}
                  href={hrefFor(t.value)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-button px-3 text-[15px] font-extrabold ${active ? "bg-radar-purple text-white" : "text-radar-purple hover:bg-lavender"}`}
                >
                  {t.label}
                  <span className={`rounded-full px-2 text-xs ${active ? "bg-white text-radar-purple" : "bg-lavender"}`}>{counts[t.value]}</span>
                </Link>
              );
            })}
          </nav>
          <form method="get" action="/dashboard/requests" className="flex items-end gap-2">
            {tab !== "incoming" && <input type="hidden" name="tab" value={tab} />}
            <div className="flex flex-col gap-1">
              <label htmlFor="req-type" className={labelCls}>
                Type
              </label>
              <select id="req-type" name="type" defaultValue={kind ?? ""} className={`${inputCls} min-h-11`}>
                <option value="">All types</option>
                {REQUEST_KINDS.filter((k) => tab !== "history" || k.value !== "team").map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={outlineBtn}>
              Show
            </button>
          </form>
        </div>

        {empty ? (
          <p className="text-base text-radar-purple/80">{kind ? "No requests of this type here." : EMPTY[tab]}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-radar-purple/10">
            {invitesIn.map((i) => (
              <InviteCard key={i.token} i={i} />
            ))}
            {invitesOut.map((m) => (
              <SentInviteCard key={m.id} m={m} />
            ))}
            {list.map((r) => (
              <LinkCard key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-radar-purple/75">
        A tag, a group membership or a podcast co-host shows on the public pages only after the admin of that comedian&apos;s profile accepts it. Only profile Admins can answer.
      </p>
    </>
  );
}

/** Requests (spec 11.4 item 7). */
export default function RequestsPage({ searchParams }: PageProps<"/dashboard/requests">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">REQUESTS</h1>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
