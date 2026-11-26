import { leavePodcast, removeGroupMember } from "@/app/actions/profile-edit";
import { card, Tag } from "@/components/dashboard/ui";
import { CoverImage } from "@/components/placeholder-image";
import { AddMembersForm, PodcastForm } from "@/components/profiles/edit-forms";
import { getComedianPodcasts, getGroupMembers, type EditableProfile } from "@/lib/data/profile-edit";
import { PODCAST_LINKS } from "@/lib/profile-forms";
import { SubmitButton } from "@/components/submit-button";

/** Group members and podcasts on Edit profile: shared by the creator dashboard and Admin > Profiles > Edit. */

const LINK_STATUS = { accepted: { label: "Accepted", tone: "yellow" }, pending: { label: "Waiting for answer", tone: "pink" }, declined: { label: "Declined", tone: "outline" } } as const;

export function Hidden({ p }: { p: EditableProfile }) {
  return (
    <>
      <input type="hidden" name="kind" value={p.kind} />
      <input type="hidden" name="profile_id" value={p.id} />
    </>
  );
}

export async function Members({ p }: { p: EditableProfile }) {
  const members = await getGroupMembers(p.id);
  const admin = p.role === "admin";
  return (
    <section aria-labelledby="members" className={`${card} flex flex-col gap-4`}>
      <h2 id="members" className="text-heading font-extrabold">
        Members
      </h2>
      {members.length === 0 ? (
        <p className="text-base text-radar-purple/80">No members yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const s = LINK_STATUS[m.link_status];
            return (
              <li key={m.comedian_id} className="flex flex-wrap items-center justify-between gap-2 rounded-button bg-lavender px-3 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{m.name}</span>
                  <Tag tone={s.tone}>{s.label}</Tag>
                  {m.status === "draft" && <span className="text-sm">draft page</span>}
                </span>
                {admin && (
                  <form action={removeGroupMember}>
                    <Hidden p={p} />
                    <input type="hidden" name="comedian_id" value={m.comedian_id} />
                    <SubmitButton className="min-h-11 rounded-button px-3 text-sm font-extrabold underline">
                      Remove<span className="sr-only"> {m.name}</span>
                    </SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {admin && <AddMembersForm groupId={p.id} />}
    </section>
  );
}

export async function Podcasts({ p }: { p: EditableProfile }) {
  const podcasts = await getComedianPodcasts(p.id);
  const admin = p.role === "admin";
  return (
    <section aria-labelledby="podcasts" className={`${card} flex flex-col gap-4`}>
      <h2 id="podcasts" className="text-heading font-extrabold">
        Podcasts
      </h2>
      {podcasts.length === 0 && <p className="text-base text-radar-purple/80">No podcasts yet.</p>}
      <ul className="flex flex-col gap-3">
        {podcasts.map((pod) => {
          const others = pod.hosts.filter((h) => h.comedian_id !== p.id);
          const listen = PODCAST_LINKS.filter((l) => pod[l.key]).map((l) => l.label);
          return (
            <li key={pod.id} className="flex flex-col gap-3 rounded-card border border-radar-purple/10 p-3">
              <div className="flex items-center gap-3">
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                  <CoverImage src={pod.cover_url} alt="" iconSize={24} className="h-full w-full" tone="deep" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-extrabold">{pod.name}</span>
                  <span className="text-sm text-radar-purple/80">{listen.length ? `On ${listen.join(", ")}` : "No listen links yet"}</span>
                  {others.length > 0 && (
                    <span className="flex flex-wrap items-center gap-1.5 text-sm">
                      Hosted with
                      {others.map((h) => (
                        <span key={h.comedian_id} className="rounded-full bg-lavender px-2 py-0.5 font-bold">
                          {h.name}
                          {h.link_status === "pending" && " · waiting"}
                          {h.link_status === "declined" && " · declined"}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              {admin && (
                <details className="rounded-button bg-lavender/60 px-3">
                  <summary className="min-h-11 cursor-pointer content-center font-extrabold">Edit {pod.name}</summary>
                  <div className="flex flex-col gap-4 pb-4">
                    <PodcastForm comedianId={p.id} podcast={pod} />
                    <form action={leavePodcast} className="border-t border-radar-purple/10 pt-3">
                      <Hidden p={p} />
                      <input type="hidden" name="podcast_id" value={pod.id} />
                      <SubmitButton className="min-h-11 text-sm font-extrabold underline">Take {p.name} off this podcast</SubmitButton>
                    </form>
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>
      {admin && (
        <details className="rounded-card border-2 border-dashed border-radar-purple/30 px-3">
          <summary className="min-h-12 cursor-pointer content-center font-extrabold">+ Add a podcast</summary>
          <div className="pb-4">
            <PodcastForm comedianId={p.id} />
          </div>
        </details>
      )}
    </section>
  );
}

