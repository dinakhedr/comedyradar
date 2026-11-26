import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { decideClaim, decideNameChange, decideProfile, decideShow, decideVenue } from "@/app/actions/admin-review";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, Tag, yellowBtn } from "@/components/dashboard/ui";
import { ExternalIcon } from "@/components/icons";
import { itemsFor, PROOF_LABELS, RELATION_LABELS, REVIEW_TABS, reviewTab, TYPE_LABELS, waited, type ReviewItem, type ReviewTab } from "@/lib/admin-review";
import { formatShowDate } from "@/lib/dates";
import { claimDocumentUrl, getReviewQueue } from "@/lib/data/admin";
import { SuccessNote } from "@/components/status-note";
import { StatusPill } from "@/components/status";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Review queue" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" }) : "";
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const iconBtn = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const textareaCls = `${inputCls} min-h-20 py-2`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-sm font-extrabold text-radar-purple/75">{label}</dt>
      <dd className="min-w-0 break-words">{children || "—"}</dd>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden="true" className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${ok ? "bg-spotlight-yellow" : "bg-laugh-pink"}`}>
        {ok ? "✓" : "!"}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Hidden({ item, tab }: { item: ReviewItem; tab: ReviewTab }) {
  return (
    <>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="tab" value={tab} />
    </>
  );
}

function ApproveReject({ approve = "Approve", reject = "Send back" }: { approve?: string; reject?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <SubmitButton name="decision" value="approve" className={`${yellowBtn} px-5`}>
        {approve}
      </SubmitButton>
      <SubmitButton name="decision" value="reject" className={outlineBtn}>
        {reject}
      </SubmitButton>
    </div>
  );
}

async function ClaimDetail({ item, tab }: { item: ReviewItem; tab: ReviewTab }) {
  const d = item.detail as {
    profile: { kind: string; name: string; slug: string; status: string; verified: boolean; instagram_url: string | null; admins: number };
    claimant: { name: string | null; email: string; account_type: string; email_confirmed: boolean; created_at: string; profiles: number };
    claim: { relation: string; proof_method: string; proof_value: string | null; proof_file_path: string | null; confirmed_at: string | null; confirmed_by_name: string | null; decision_reason: string | null; admin_note: string | null };
    checks: { other_open_claims: number; handle_matches: boolean };
  };
  const doc = d.claim.proof_file_path ? await claimDocumentUrl(d.claim.proof_file_path) : null;
  const page = d.profile.status === "published" ? `/${d.profile.kind === "group" ? "groups" : "comedians"}/${d.profile.slug}` : null;
  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="font-extrabold">The profile</h3>
        <dl className="flex flex-col gap-2">
          <Row label="Profile">
            {d.profile.name} ({d.profile.kind}){" "}
            {page && (
              <a href={page} target="_blank" rel="noreferrer" className="font-bold underline">
                View page
              </a>
            )}
          </Row>
          <Row label="Status">
            {d.profile.status}
            {d.profile.verified ? " · verified" : ""} · {d.profile.admins === 0 ? "no admin yet" : `${d.profile.admins} admin${d.profile.admins === 1 ? "" : "s"}`}
          </Row>
          <Row label="Instagram on profile">{d.profile.instagram_url}</Row>
        </dl>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-extrabold">Who is asking</h3>
        <dl className="flex flex-col gap-2">
          <Row label="Name">{d.claimant.name}</Row>
          <Row label="Email">
            {d.claimant.email} {d.claimant.email_confirmed ? "(confirmed)" : "(not confirmed)"}
          </Row>
          <Row label="Account">
            {d.claimant.account_type === "manager" ? "Manager or agent" : "Comedian"} · since {day(d.claimant.created_at)} · {d.claimant.profiles} other profile
            {d.claimant.profiles === 1 ? "" : "s"}
          </Row>
          <Row label="Relation">{RELATION_LABELS[d.claim.relation] ?? d.claim.relation}</Row>
          <Row label="Proof">
            {PROOF_LABELS[d.claim.proof_method] ?? d.claim.proof_method}
            {d.claim.proof_value ? ` · @${d.claim.proof_value}` : ""}
            {doc && (
              <>
                {" "}
                <a href={doc} target="_blank" rel="noreferrer" className="font-bold underline">
                  Open the document
                </a>
              </>
            )}
          </Row>
          {d.claim.admin_note && <Row label="Your note">{d.claim.admin_note}</Row>}
          {d.claim.decision_reason && <Row label="Last message sent">{d.claim.decision_reason}</Row>}
        </dl>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-extrabold">Proof and checks</h3>
        <ul className="flex flex-col gap-1.5 text-[15px]">
          {d.claim.proof_method === "official_dm" && (
            <>
              <Check ok={d.checks.handle_matches}>
                {d.checks.handle_matches
                  ? `@${d.claim.proof_value} is the Instagram saved on the profile.`
                  : `@${d.claim.proof_value} is not the Instagram saved on the profile. Check carefully.`}
              </Check>
              <Check ok={false}>Check the DM on @comedy_radar from @{d.claim.proof_value} before approving.</Check>
            </>
          )}
          {d.claim.proof_method === "comedian_confirms" && (
            <Check ok={!!d.claim.confirmed_at}>
              {d.claim.confirmed_at ? `Confirmed by "${d.claim.confirmed_by_name}" on ${day(d.claim.confirmed_at)}.` : "Not confirmed yet. The link has not been opened."}
            </Check>
          )}
          {d.claim.proof_method === "document" && <Check ok={!!doc}>{doc ? "A document is attached. Open it above." : "The document could not be opened."}</Check>}
          <Check ok={d.checks.other_open_claims === 0}>
            {d.checks.other_open_claims === 0 ? "No other open claims for this profile." : `${d.checks.other_open_claims} other open claim(s) for this profile.`}
          </Check>
          <Check ok={d.claimant.email_confirmed}>{d.claimant.email_confirmed ? "Email confirmed." : "Email not confirmed."}</Check>
        </ul>
      </section>
      <form action={decideClaim} className="flex flex-col gap-3 rounded-button bg-lavender p-4">
        <Hidden item={item} tab={tab} />
        <h3 className="font-extrabold">Decision</h3>
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">Decision</legend>
          {[
            ["admin", "Approve as Admin"],
            ["moderator", "Approve as Moderator"],
            ["more_proof", "Ask for more proof"],
            ["reject", "Reject"],
          ].map(([v, l], i) => (
            <label key={v} className="flex min-h-11 items-center gap-3 font-bold">
              <input type="radio" name="decision" value={v} defaultChecked={i === 0} className="h-5 w-5 accent-radar-purple" />
              {l}
            </label>
          ))}
        </fieldset>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="verify" value="yes" defaultChecked={!d.profile.verified} className="h-5 w-5 accent-radar-purple" />
          Mark the profile as verified (when approving)
        </label>
        <div className="flex flex-col gap-1">
          <label htmlFor={`reason-${item.id}`} className={labelCls}>
            Message to the person
          </label>
          <textarea id={`reason-${item.id}`} name="reason" maxLength={1000} className={textareaCls} placeholder="Shown in their dashboard. Needed when you ask for more proof or reject." />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`note-${item.id}`} className={labelCls}>
            Internal note (only super admins)
          </label>
          <textarea id={`note-${item.id}`} name="note" maxLength={1000} defaultValue={d.claim.admin_note ?? ""} className={textareaCls} />
        </div>
        <SubmitButton className={`${yellowBtn} self-start px-6`}>Confirm</SubmitButton>
      </form>
    </>
  );
}

function ProfileDetail({ item, tab }: { item: ReviewItem; tab: ReviewTab }) {
  const d = item.detail;
  const same = Number(d.same_name ?? 0);
  return (
    <>
      <dl className="flex flex-col gap-2">
        <Row label="Type">{s(d.kind)}</Row>
        <Row label="Name">
          {s(d.name)}
          {d.name_ar ? ` · ${s(d.name_ar)}` : ""}
        </Row>
        <Row label="Bio">{s(d.bio)}</Row>
        <Row label="Instagram">{s(d.instagram_url)}</Row>
        <Row label="Created by">
          {s(d.created_by)} {d.created_by_email && d.created_by_email !== d.created_by ? `(${s(d.created_by_email)})` : ""}
        </Row>
      </dl>
      <ul className="flex flex-col gap-1.5 text-[15px]">
        <Check ok={same === 0}>{same === 0 ? "No other profile has this name." : `${same} other profile(s) have the same name. It may be a duplicate.`}</Check>
        <Check ok={!!d.photo_url}>{d.photo_url ? "Has a photo." : "No photo yet."}</Check>
      </ul>
      <form action={decideProfile} className="flex flex-col gap-3 rounded-button bg-lavender p-4">
        <Hidden item={item} tab={tab} />
        <input type="hidden" name="kind" value={s(d.kind)} />
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="verify" value="yes" className="h-5 w-5 accent-radar-purple" />
          Also mark as verified
        </label>
        <ApproveReject approve="Publish" reject="Send back to draft" />
      </form>
    </>
  );
}

function ShowDetail({ item, tab }: { item: ReviewItem; tab: ReviewTab }) {
  const d = item.detail;
  const price = d.price_min != null ? `${s(d.currency)} ${s(d.price_min)}${d.price_max != null && d.price_max !== d.price_min ? `–${s(d.price_max)}` : ""}` : "";
  return (
    <>
      <dl className="flex flex-col gap-2">
        <Row label="Show">{s(d.title)}</Row>
        <Row label="When">{d.starts_at ? formatShowDate(new Date(s(d.starts_at))) : ""}</Row>
        <Row label="Where">{[s(d.venue), s(d.city)].filter(Boolean).join(", ")}</Row>
        <Row label="Performers">{s(d.performers)}</Row>
        <Row label="Price">{price}</Row>
        <Row label="Tickets">
          {d.ticket_url ? (
            <a href={s(d.ticket_url)} target="_blank" rel="noreferrer" className="font-bold underline">
              Open the ticket link
            </a>
          ) : (
            ""
          )}
        </Row>
        <Row label="Added by">{s(d.created_by)}</Row>
      </dl>
      <ul className="flex flex-col gap-1.5 text-[15px]">
        <Check ok={!!d.ticket_url}>{d.ticket_url ? "Has a ticket link." : "No ticket link."}</Check>
        <Check ok={!!d.any_verified}>{d.any_verified ? "A performer is verified." : "No performer is verified yet."}</Check>
        <Check ok={!!d.poster_url}>{d.poster_url ? "Has a poster." : "No poster."}</Check>
      </ul>
      <form action={decideShow} className="flex flex-col gap-3 rounded-button bg-lavender p-4">
        <Hidden item={item} tab={tab} />
        <ApproveReject approve="Publish" reject="Send back to draft" />
      </form>
    </>
  );
}

function VenueDetail({ item, tab }: { item: ReviewItem; tab: ReviewTab }) {
  const d = item.detail;
  const same = Number(d.same_name ?? 0);
  return (
    <>
      <dl className="flex flex-col gap-2">
        <Row label="Venue">{s(d.name)}</Row>
        <Row label="City">{s(d.city)}</Row>
        <Row label="Address">{s(d.address)}</Row>
        <Row label="Map">
          {d.map_url ? (
            <a href={s(d.map_url)} target="_blank" rel="noreferrer" className="font-bold underline">
              Open the map
            </a>
          ) : (
            ""
          )}
        </Row>
        <Row label="Suggested by">{s(d.suggested_by)}</Row>
      </dl>
      <ul className="flex flex-col gap-1.5 text-[15px]">
        <Check ok={same === 0}>{same === 0 ? "No other venue has this name." : `${same} other venue(s) have the same name. It may be a duplicate.`}</Check>
      </ul>
      <form action={decideVenue} className="flex flex-col gap-3 rounded-button bg-lavender p-4">
        <Hidden item={item} tab={tab} />
        <ApproveReject approve="Approve venue" reject="Archive" />
      </form>
    </>
  );
}

function NameDetail({ item, tab }: { item: ReviewItem; tab: ReviewTab }) {
  const d = item.detail;
  return (
    <>
      <dl className="flex flex-col gap-2">
        <Row label="Profile">{s(d.kind)}</Row>
        <Row label="Now">
          {s(d.old_name)}
          {d.old_name_ar ? ` · ${s(d.old_name_ar)}` : ""}
        </Row>
        <Row label="New name">
          <strong>{s(d.name)}</strong>
          {d.name_ar ? ` · ${s(d.name_ar)}` : ""}
        </Row>
        <Row label="Asked by">{s(d.requested_by)}</Row>
      </dl>
      <form action={decideNameChange} className="flex flex-col gap-3 rounded-button bg-lavender p-4">
        <Hidden item={item} tab={tab} />
        <div className="flex flex-col gap-1">
          <label htmlFor={`reason-${item.id}`} className={labelCls}>
            Reason (shown when you reject)
          </label>
          <textarea id={`reason-${item.id}`} name="reason" maxLength={1000} className={textareaCls} />
        </div>
        <ApproveReject approve="Approve the new name" reject="Reject" />
      </form>
    </>
  );
}

function Detail({ item, tab, next }: { item: ReviewItem; tab: ReviewTab; next: string | null }) {
  return (
    <article aria-labelledby="detail" className={`${card} flex min-w-0 flex-col gap-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p>
            <Tag tone="outline">{TYPE_LABELS[item.type]}</Tag>
          </p>
          <h2 id="detail" className="text-heading font-extrabold break-words">
            {item.title}
          </h2>
          <p className="text-sm text-radar-purple/75">
            {item.sub}
            {item.created_at ? ` · sent ${day(item.created_at)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {item.type === "shows" && !!item.detail.slug && (
            <a href={`/shows/${s(item.detail.slug)}`} target="_blank" rel="noreferrer" className={iconBtn} aria-label="Open the show page" title="Open the show page">
              <ExternalIcon />
            </a>
          )}
          {next && (
            <Link href={next} className={`${outlineBtn} border-transparent`}>
              Skip to next
            </Link>
          )}
        </div>
      </div>
      {item.type === "claims" && <ClaimDetail item={item} tab={tab} />}
      {item.type === "profiles" && <ProfileDetail item={item} tab={tab} />}
      {item.type === "shows" && <ShowDetail item={item} tab={tab} />}
      {item.type === "venues" && <VenueDetail item={item} tab={tab} />}
      {item.type === "names" && <NameDetail item={item} tab={tab} />}
    </article>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/review">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const tab = reviewTab(one(sp.tab));
  const queue = await getReviewQueue();
  const now = new Date();
  const list = itemsFor(tab, queue.pending);
  const picked = list.find((i) => i.id === one(sp.item)) ?? list[0] ?? null;
  const idx = picked ? list.indexOf(picked) : -1;
  const href = (t: ReviewTab, item?: string) => {
    const q = new URLSearchParams();
    if (t !== "all") q.set("tab", t);
    if (item) q.set("item", item);
    const qs = q.toString();
    return qs ? `/admin/review?${qs}` : "/admin/review";
  };
  const next = idx >= 0 && idx < list.length - 1 ? href(tab, list[idx + 1].id) : null;
  const count = (t: ReviewTab) => (t === "done" ? queue.done.length : itemsFor(t, queue.pending).length);
  const done = one(sp.done);

  return (
    <>
      {done && (
        <SuccessNote>{done === "saved" ? "Saved. The next item is open." : "This item was already decided."}</SuccessNote>
      )}
      <nav aria-label="Review tabs" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {REVIEW_TABS.map((t) => {
          const active = t.value === tab;
          return (
            <Link
              key={t.value}
              href={href(t.value)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-button px-3 text-[15px] font-extrabold ${active ? "bg-stage-black text-white" : "text-radar-purple hover:bg-white"}`}
            >
              {t.label}
              <span className={`rounded-full px-2 text-xs ${active ? "bg-white text-stage-black" : "bg-white"}`}>{count(t.value)}</span>
            </Link>
          );
        })}
      </nav>

      {tab === "done" ? (
        <section aria-label="Decided" className={`${card} flex flex-col gap-2`}>
          {queue.done.length === 0 ? (
            <p className="text-radar-purple/80">Decided claims and name changes show up here.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-radar-purple/10">
              {queue.done.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 py-3">
                  <Tag tone="outline">{d.type === "claims" ? "Claim" : "Name change"}</Tag>
                  <span className="font-bold">{d.title}</span>
                  <span className="text-sm text-radar-purple/75">{d.sub}</span>
                  <StatusPill status={d.status === "approved" ? "approved" : "rejected"} label={d.status === "approved" ? "Approved" : "Rejected"} />
                  <span className="ml-auto text-sm text-radar-purple/70">{day(d.decided_at)}</span>
                  {d.reason && <p className="w-full text-sm text-radar-purple/80">“{d.reason}”</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : list.length === 0 ? (
        <p className={`${card} text-radar-purple/80`}>Nothing waiting here. Well done!</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
          <section aria-label="Waiting" className={`${card} flex flex-col gap-1 p-2 md:p-3`}>
            <ul className="flex flex-col gap-1">
              {list.map((i) => {
                const on = picked?.id === i.id;
                return (
                  <li key={i.id}>
                    <Link
                      href={href(tab, i.id)}
                      aria-current={on ? "true" : undefined}
                      className={`flex flex-col gap-1 rounded-button p-3 ${on ? "bg-lavender ring-2 ring-radar-purple" : "hover:bg-lavender"}`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <Tag tone="outline">{TYPE_LABELS[i.type]}</Tag>
                        {i.created_at && <span className="text-xs text-radar-purple/70">waiting {waited(i.created_at, now)}</span>}
                      </span>
                      <span className="font-extrabold break-words">{i.title}</span>
                      <span className="text-sm text-radar-purple/75">
                        {[i.sub, i.flag].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          {picked && <Detail key={picked.id} item={picked} tab={tab} next={next} />}
        </div>
      )}
    </>
  );
}

/** Review queue (spec 11.5 item 2). */
export default function ReviewPage({ searchParams }: PageProps<"/admin/review">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">REVIEW QUEUE</h1>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
