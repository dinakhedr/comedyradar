import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AnswerForm } from "@/components/team/team-forms";
import { getInvite } from "@/lib/data/team";
import { ROLES } from "@/lib/team-forms";

export const metadata: Metadata = {
  title: "Team invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const role = (r: string | null | undefined) => ROLES.find((x) => x.value === r)?.label ?? "Moderator";

async function Content({ params }: { params: PageProps<"/team/invite/[token]">["params"] }) {
  const { token } = await params;
  const { invite, signedIn } = UUID.test(token) ? await getInvite(token) : { invite: null, signedIn: false };

  if (!invite || invite.status === "removed" || invite.status === "active") {
    return (
      <>
        <h1 className="font-display text-[32px] leading-none md:text-[40px]">LINK NOT VALID</h1>
        <p className="text-base">This invitation was already used, cancelled or declined. Ask the person who invited you for a new link.</p>
      </>
    );
  }
  if (invite.status === "expired") {
    return (
      <>
        <h1 className="font-display text-[32px] leading-none md:text-[40px]">INVITATION EXPIRED</h1>
        <p className="text-base">Invitations work for 7 days. Ask {invite.owner_name} to send it again.</p>
      </>
    );
  }
  const next = `/team/invite/${token}`;
  return (
    <>
      <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Comedy Radar</p>
      <h1 className="font-display text-[32px] leading-none md:text-[40px]">JOIN THE TEAM</h1>
      <p className="text-base">
        <strong>{invite.owner_name}</strong> invited you to help manage their pages on Comedy Radar
        {invite.scope === "all" ? (
          <>
            {" "}
            as <strong>{role(invite.all_role)}</strong> on all their profiles.
          </>
        ) : (
          ":"
        )}
      </p>
      {invite.profiles.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {invite.profiles.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 rounded-button bg-lavender px-3 py-2">
              <span className="font-bold">
                {p.name} <span className="text-sm font-normal text-radar-purple/75">({p.kind === "group" ? "group" : "comedian"})</span>
              </span>
              <span className="text-sm font-extrabold">{invite.scope === "all" ? role(invite.all_role) : role(p.role)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-radar-purple/80">
        Admins edit the profile, the team and members, and add shows and tours. Moderators add and edit shows and tours only.
      </p>
      {!signedIn ? (
        <>
          <p className="text-base">
            This invitation is for <strong>{invite.invite_email}</strong>. Sign in with that email, or create a free account with it, then open this link again.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href={`/signin?next=${encodeURIComponent(next)}`} className={`${yellowBtn} min-h-12 px-6`}>
              Sign in to accept
            </Link>
            <Link href="/signup" className={`${outlineBtn} min-h-12 px-6`}>
              Create an account
            </Link>
          </div>
        </>
      ) : invite.for_me ? (
        <AnswerForm token={token} />
      ) : (
        <p role="alert" className="rounded-button bg-lavender px-4 py-3 font-bold">
          This invitation was sent to {invite.invite_email}, not to the email you are signed in with. Sign out and sign in with {invite.invite_email} to accept it.
        </p>
      )}
    </>
  );
}

/** A dashboard team invitation (spec 11.4 item 6). */
export default function TeamInvitePage({ params }: PageProps<"/team/invite/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col px-[18px] pt-4 pb-14 md:pt-10">
        <div className="flex flex-col gap-4 rounded-card bg-white p-5 text-radar-purple md:p-8">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-card bg-lavender" />}>
            <Content params={params} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
