import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  accountAction,
  sendPasswordReset,
  setAccountType,
} from "@/app/actions/admin-accounts";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, StatTile, Tag } from "@/components/dashboard/ui";
import { CloseIcon, EditIcon, SaveIcon } from "@/components/icons";
import {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  accountStatusOf,
  accountTypeOf,
  signUpMethod,
} from "@/lib/admin-accounts";
import { ROLE_LABELS } from "@/lib/dashboard";
import {
  getAdminAccount,
  getAdminAccounts,
  requireSuperAdmin,
  type AdminAccountRow,
} from "@/lib/data/admin";
import { UUID } from "@/lib/profile-server";
import { ErrorNote, SuccessNote } from "@/components/status-note";

export const metadata: Metadata = { title: "Accounts" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const MSG: Record<string, [string, boolean]> = {
  signout: [
    "Signed out of all devices. Open pages stop working within an hour.",
    true,
  ],
  suspend: [
    "Account suspended and signed out. It can no longer change anything.",
    true,
  ],
  unsuspend: ["Suspension lifted.", true],
  type_saved: ["Account type changed.", true],
  reset_sent: ["Password reset link sent to their email.", true],
  rate_limit: [
    "Too many emails were sent just now. Please try again in a few minutes.",
    false,
  ],
  protected: [
    "Super admin accounts cannot be signed out or suspended from here.",
    false,
  ],
  error: ["Something went wrong. Please try again.", false],
};
const iconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const suspendBtn =
  "inline-flex min-h-11 w-full items-center justify-center rounded-button border-2 border-laugh-pink-deep bg-white px-4 text-[15px] font-extrabold text-laugh-pink-deep hover:bg-laugh-pink/15";
const th = "px-2 py-2 font-extrabold whitespace-nowrap";
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Africa/Cairo",
      })
    : "Never";
const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Cairo",
      })
    : "";

function statusTag(a: AdminAccountRow) {
  if (a.status === "suspended") return <Tag tone="pink">Suspended</Tag>;
  if (a.status === "unconfirmed")
    return <Tag tone="outline">Email not confirmed</Tag>;
  return <Tag tone="yellow">Active</Tag>;
}
const typeLabel = (a: AdminAccountRow) =>
  a.type === "manager" ? "Manager or agent" : "Comedian";

function ProfilesCell({ a }: { a: AdminAccountRow }) {
  if (a.profiles.length === 0)
    return <span className="text-radar-purple/60">None</span>;
  const first = a.profiles.slice(0, 2);
  return (
    <span className="text-xs">
      {first.map((p) => (
        <span key={`${p.kind}-${p.slug}`} className="block break-words">
          <strong>{p.name}</strong> · {ROLE_LABELS[p.role]}
        </span>
      ))}
      {a.profiles.length > 2 && (
        <span className="block text-radar-purple/70">
          +{a.profiles.length - 2} more
        </span>
      )}
    </span>
  );
}

async function SidePanel({
  id,
  ret,
  close,
  meId,
}: {
  id: string;
  ret: string;
  close: string;
  meId: string;
}) {
  const a = await getAdminAccount(id);
  if (!a) return null;
  const hidden = (
    <>
      <input type="hidden" name="id" value={a.id} />
      <input type="hidden" name="ret" value={ret} />
    </>
  );
  const canAct = !a.super_admin && a.id !== meId;
  return (
    <aside
      aria-labelledby="panel"
      className={`${card} order-first flex min-w-0 flex-col gap-5 2xl:sticky 2xl:top-6 2xl:order-none`}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="panel" className="text-heading font-extrabold break-words">
            {a.name ?? a.email}
          </h2>
          <p className="text-sm break-all text-radar-purple/75">{a.email}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {typeLabel(a)} {statusTag(a)}{" "}
            {a.super_admin && <Tag tone="purple">Super admin</Tag>}
          </p>
        </div>
        <Link href={close} className={iconBtn} aria-label="Close" title="Close">
          <CloseIcon size={20} />
        </Link>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            <dt className="font-bold">Signed up</dt>
            <dd>
              {day(a.created_at)} · {signUpMethod(a.provider)}
            </dd>
            <dt className="font-bold">Email</dt>
            <dd>
              {a.confirmed
                ? `Confirmed ${day(a.confirmed_at)}`
                : "Not confirmed yet"}
            </dd>
            <dt className="font-bold">Last sign-in</dt>
            <dd>{when(a.last_sign_in_at)}</dd>
            <dt className="font-bold">2-step</dt>
            <dd>{a.two_step ? "On (authenticator app)" : "Off"}</dd>
          </dl>

          <section
            aria-labelledby="acc-profiles"
            className="flex flex-col gap-2"
          >
            <h3 id="acc-profiles" className="font-extrabold">
              Profiles
            </h3>
            {a.profiles.length === 0 ? (
              <p className="text-sm text-radar-purple/75">
                This account does not manage any profile.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-radar-purple/10 text-sm">
                {a.profiles.map((p) => (
                  <li
                    key={`${p.kind}-${p.slug}`}
                    className="flex flex-wrap items-center gap-2 py-2"
                  >
                    <Link
                      href={`/admin/profiles?q=${encodeURIComponent(p.name)}`}
                      className="min-w-0 flex-1 font-bold break-words hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="text-xs text-radar-purple/70">
                      {p.kind === "group" ? "Group" : "Comedian"}
                    </span>
                    <Tag tone={p.role === "admin" ? "purple" : "outline"}>
                      {ROLE_LABELS[p.role]}
                    </Tag>
                    {p.via_team && (
                      <span className="text-xs text-radar-purple/70">
                        through a team
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="acc-team"
            className="flex flex-col gap-2 text-sm"
          >
            <h3 id="acc-team" className="font-extrabold">
              Team
            </h3>
            <p>
              {a.team.length === 0
                ? "Nobody on their team."
                : `Their team: ${a.team.map((m) => `${m.name ?? "Someone"}${m.status === "invited" ? " (invited)" : ""}`).join(", ")}.`}
            </p>
            {a.member_of.length > 0 && (
              <p>
                On the team of:{" "}
                {a.member_of.map((m) => m.name ?? "Someone").join(", ")}.
              </p>
            )}
          </section>
        </div>
        <section
          aria-labelledby="acc-actions"
          className="flex flex-col gap-2 rounded-button bg-lavender p-3"
        >
          <h3 id="acc-actions" className="font-extrabold">
            Actions
          </h3>
          <form action={setAccountType} className="flex flex-col gap-1">
            {hidden}
            <label htmlFor="acc-type" className="text-sm font-bold">
              Account type
            </label>
            <div className="flex gap-2">
              <select
                id="acc-type"
                name="type"
                defaultValue={a.type}
                className={`${inputCls} min-h-11 min-w-0 flex-1 bg-white`}
              >
                <option value="comedian">Comedian</option>
                <option value="manager">Manager or agent</option>
              </select>
              <button
                className={`${outlineBtn} h-11 w-11 shrink-0 bg-white px-0!`}
                aria-label="Save account type"
                title="Save account type"
              >
                <SaveIcon />
              </button>
            </div>
          </form>
          <form action={sendPasswordReset}>
            {hidden}
            <button className={`${outlineBtn} w-full bg-white`}>
              Send password reset link
            </button>
          </form>
          {canAct && (
            <>
              <form action={accountAction}>
                {hidden}
                <input type="hidden" name="action" value="signout" />
                <button className={`${outlineBtn} w-full bg-white`}>
                  Sign out of all devices
                </button>
              </form>
              <form action={accountAction}>
                {hidden}
                <input
                  type="hidden"
                  name="action"
                  value={a.suspended ? "unsuspend" : "suspend"}
                />
                <button
                  className={
                    a.suspended ? `${outlineBtn} w-full bg-white` : suspendBtn
                  }
                >
                  {a.suspended ? "Lift the suspension" : "Suspend account"}
                </button>
              </form>
            </>
          )}
          <p className="text-xs text-radar-purple/75">
            Passwords are never visible to anyone.{" "}
            {a.suspended
              ? ""
              : "Suspending signs the person out and stops every change; their public profiles stay as they are."}
          </p>
        </section>
      </div>
    </aside>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/admin/accounts">["searchParams"];
}) {
  await connection();
  const [me, sp] = await Promise.all([requireSuperAdmin(), searchParams]);
  const q = one(sp.q).slice(0, 80);
  const type = accountTypeOf(one(sp.type));
  const status = accountStatusOf(one(sp.status));
  const picked = UUID.test(one(sp.a)) ? one(sp.a) : "";
  const data = await getAdminAccounts({ q, type, status });
  const msg = MSG[one(sp.msg)];

  const link = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, type, status, ...over }))
      if (v) u.set(k, v);
    const qs = u.toString();
    return qs ? `/admin/accounts?${qs}` : "/admin/accounts";
  };
  const ret = link(picked ? { a: picked } : {});
  const filtered = q || type || status;

  return (
    <>
      {msg && (
        msg[1] ? (
          <SuccessNote>{msg[0]}</SuccessNote>
        ) : (
          <ErrorNote>{msg[0]}</ErrorNote>
        )
      )}
      <section
        aria-label="Numbers"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5"
      >
        <StatTile
          label="Accounts"
          value={data.stats.total}
          note={`${data.stats.new_7} new this week`}
        />
        <StatTile label="Comedians" value={data.stats.comedians} />
        <StatTile label="Managers or agents" value={data.stats.managers} />
        <StatTile label="Email not confirmed" value={data.stats.unconfirmed} />
        <StatTile label="Suspended" value={data.stats.suspended} />
      </section>

      <div
        className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${picked ? "2xl:grid-cols-[minmax(0,1fr)_400px] 2xl:items-start" : ""}`}
      >
        <section
          aria-labelledby="list"
          className={`${card} flex min-w-0 flex-col gap-4`}
        >
          <h2 id="list" className="sr-only">
            Accounts
          </h2>
          <form
            method="get"
            action="/admin/accounts"
            className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="aa-q" className={labelCls}>
                Search
              </label>
              <input
                id="aa-q"
                name="q"
                defaultValue={q}
                placeholder="Name or email"
                className={`${inputCls} min-h-11`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="aa-type" className={labelCls}>
                Type
              </label>
              <select
                id="aa-type"
                name="type"
                defaultValue={type}
                className={`${inputCls} min-h-11`}
              >
                <option value="">All types</option>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="aa-status" className={labelCls}>
                Status
              </label>
              <select
                id="aa-status"
                name="status"
                defaultValue={status}
                className={`${inputCls} min-h-11`}
              >
                <option value="">Any status</option>
                {ACCOUNT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={outlineBtn}>
                Show
              </button>
              {filtered && (
                <Link
                  href="/admin/accounts"
                  className={`${outlineBtn} border-transparent`}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          {data.rows.length === 0 ? (
            <p className="text-radar-purple/80">
              {filtered
                ? "No accounts match these filters."
                : "No accounts yet."}
            </p>
          ) : (
            <div className="relative -mx-4 overflow-x-auto md:mx-0">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                    <th className="px-4 py-2 font-extrabold md:px-2">
                      Account
                    </th>
                    <th className={th}>Type</th>
                    <th className={th}>Profiles and role</th>
                    <th className={th}>Last sign-in</th>
                    <th className={th}>2-step</th>
                    <th className={th}>Status</th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((a) => (
                    <tr
                      key={a.id}
                      className={`border-b border-radar-purple/10 align-top ${picked === a.id ? "bg-lavender" : ""}`}
                    >
                      <td className="max-w-64 px-4 py-2 md:px-2">
                        <Link
                          href={link({ a: a.id })}
                          className="font-extrabold break-words hover:underline"
                        >
                          {a.name ?? a.email ?? "No name"}
                        </Link>
                        {a.super_admin && (
                          <span className="ml-1.5 align-middle">
                            <Tag tone="purple">Super admin</Tag>
                          </span>
                        )}
                        <span className="block text-xs break-all text-radar-purple/70">
                          {a.email}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {typeLabel(a)}
                        {a.team_member && (
                          <span className="block text-radar-purple/70">
                            Team member
                          </span>
                        )}
                      </td>
                      <td className="max-w-56 px-2 py-2">
                        <ProfilesCell a={a} />
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap">
                        {when(a.last_sign_in_at)}
                      </td>
                      <td className="px-2 py-2">
                        {a.two_step ? (
                          <Tag tone="outline">On</Tag>
                        ) : (
                          <span className="text-xs text-radar-purple/60">
                            Off
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">{statusTag(a)}</td>
                      <td className="px-2 py-1 text-right">
                        <Link
                          href={link({ a: a.id })}
                          className={iconBtn}
                          aria-label={`Manage ${a.name ?? a.email}`}
                          title="Manage"
                        >
                          <EditIcon />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.rows.length >= 300 && (
            <p className="text-sm text-radar-purple/75">
              Showing the newest 300. Search to narrow the list.
            </p>
          )}
        </section>
        {picked && (
          <SidePanel
            key={picked}
            id={picked}
            ret={ret}
            close={link({})}
            meId={me.id}
          />
        )}
      </div>
    </>
  );
}

/** Admin Accounts (spec 11.5 item 5). */
export default function AdminAccountsPage({
  searchParams,
}: PageProps<"/admin/accounts">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">
        ACCOUNTS
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
