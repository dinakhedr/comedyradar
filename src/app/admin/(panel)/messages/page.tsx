import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { setMessageStatus } from "@/app/actions/admin-messages";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import {
  card,
  outlineBtn,
  StatTile,
  Tag,
  type Tone,
} from "@/components/dashboard/ui";
import { MailIcon } from "@/components/icons";
import {
  MESSAGE_STATUSES,
  messageStatusOf,
  senderLabel,
  topicLabel,
} from "@/lib/contact";
import { getAdminMessages, type AdminMessage } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Messages" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const PAGE = 50;
const MSG: Record<string, [string, boolean]> = {
  new: ["Marked as new.", true],
  replied: ["Marked as replied.", true],
  closed: ["Closed.", true],
  error: ["Something went wrong. Please try again.", false],
};
const STATUS_TONE: Record<AdminMessage["status"], Tone> = {
  new: "pink",
  replied: "yellow",
  closed: "outline",
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });

/** A page link from a message, shown only when it is a web link or a site path. */
function pageHref(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return /^https?:\/\//i.test(url) ? url : null;
}

function replyHref(m: AdminMessage) {
  const subject = `Re: your message to Comedy Radar (${topicLabel(m.topic)})`;
  const quoted = m.message
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Hi ${m.name},\n\n\n\n${quoted}`)}`;
}

function Message({ m, ret }: { m: AdminMessage; ret: string }) {
  const href = pageHref(m.page_url);
  const next =
    m.status === "new"
      ? ["replied", "closed"]
      : m.status === "replied"
        ? ["closed", "new"]
        : ["new"];
  const btn: Record<string, string> = {
    replied: "Mark replied",
    closed: "Close",
    new: "Mark as new",
  };
  return (
    <li id={`m-${m.id}`} className={`${card} flex scroll-mt-6 flex-col gap-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold break-words">{m.name}</span>
            <Tag tone={STATUS_TONE[m.status]}>{m.status}</Tag>
          </p>
          <p className="text-sm break-all text-radar-purple/75">
            {m.email} · {senderLabel(m.sender_type)}
          </p>
        </div>
        <p className="text-sm font-bold text-radar-purple/75">
          {when(m.created_at)}
        </p>
      </div>
      <p className="text-sm">
        <span className="font-extrabold">{topicLabel(m.topic)}</span>
        {m.page_url && (
          <>
            {" · "}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="font-bold break-all underline"
              >
                {m.page_url}
              </a>
            ) : (
              <span className="break-all">{m.page_url}</span>
            )}
          </>
        )}
      </p>
      <p className="rounded-button bg-lavender p-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
        {m.message}
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={replyHref(m)} className={`${outlineBtn} gap-2`}>
          <MailIcon size={18} /> Reply by email
        </a>
        {next.map((s) => (
          <form key={s} action={setMessageStatus}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value={s} />
            <input type="hidden" name="ret" value={ret} />
            <button
              className={`${outlineBtn} ${s === "new" ? "border-transparent" : ""}`}
            >
              {btn[s]}
            </button>
          </form>
        ))}
      </div>
    </li>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/admin/messages">["searchParams"];
}) {
  await connection();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const raw = one(sp.status);
  const status = raw === "all" ? "" : messageStatusOf(raw) || "new";
  const n = Math.min(Math.max(Number(one(sp.n)) || PAGE, PAGE), 500);
  const data = await getAdminMessages({ status, q, limit: n });
  const msg = MSG[one(sp.msg)];

  const params = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({
      status: status || "all",
      q,
      ...over,
    }))
      if (v) u.set(k, v);
    if (u.get("status") === "new") u.delete("status");
    return u.toString();
  };
  const ret = `/admin/messages?${params({})}`;
  const tabs = [
    ...MESSAGE_STATUSES.map((s) => ({
      value: s.value as string,
      label: s.label,
    })),
    { value: "", label: "All" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {msg && (
        <p
          role="status"
          className={`rounded-button px-4 py-3 font-bold ${msg[1] ? "bg-spotlight-yellow text-radar-purple" : "bg-laugh-pink text-white"}`}
        >
          {msg[0]}
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="New" value={data.counts.new} />
        <StatTile label="Replied" value={data.counts.replied} />
        <StatTile label="Closed" value={data.counts.closed} />
      </div>
      <div className={`${card} flex flex-col gap-4`}>
        <nav aria-label="Message status" className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const on = status === t.value;
            return (
              <Link
                key={t.value || "all"}
                href={`/admin/messages?${params({ status: t.value || "all", n: "" })}`}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-extrabold ${on ? "border-radar-purple bg-radar-purple text-white" : "border-radar-purple/20 hover:border-radar-purple"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <form
          method="get"
          action="/admin/messages"
          className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-2"
        >
          <input type="hidden" name="status" value={status || "all"} />
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="msg-q" className={labelCls}>
              Search
            </label>
            <input
              id="msg-q"
              name="q"
              defaultValue={q}
              placeholder="Name, email or words in the message"
              className={`${inputCls} min-h-11`}
            />
          </div>
          <button className={outlineBtn}>Search</button>
        </form>
        <p className="text-sm text-radar-purple/75">
          Messages from the Contact page. Until there is an email service, they
          arrive only here. &quot;Reply by email&quot; opens your email app with
          the message quoted.
        </p>
      </div>
      {data.rows.length === 0 ? (
        <p className={`${card} text-radar-purple/80`}>
          {q || status !== "new"
            ? "No messages match."
            : "No new messages. You're all caught up."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.rows.map((m) => (
            <Message key={m.id} m={m} ret={ret} />
          ))}
        </ul>
      )}
      {data.more && (
        <Link
          href={`/admin/messages?${params({ n: String(n + PAGE) })}`}
          scroll={false}
          className={`${outlineBtn} self-center`}
        >
          Load older
        </Link>
      )}
    </div>
  );
}

/** Admin Messages: what visitors send from the Contact page (spec 7.5 item 3). */
export default function AdminMessagesPage({
  searchParams,
}: PageProps<"/admin/messages">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">
        MESSAGES
      </h1>
      <Suspense
        fallback={
          <div className={`${card} h-96 animate-pulse`} aria-busy="true" />
        }
      >
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
