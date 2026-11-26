"use client";

import { useActionState, useId, useState } from "react";
import { answerInvite, inviteMember, updateAccess, type AnswerState, type TeamState } from "@/app/actions/team";
import { errorCls, FormMessage, inputCls, labelCls } from "@/components/auth/fields";
import { outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import type { ManagedProfile } from "@/lib/dashboard";
import type { TeamMember } from "@/lib/data/team";
import { ROLES, type Role } from "@/lib/team-forms";

const keyOf = (p: { kind: string; id: string }) => `${p.kind === "group" ? "g" : "c"}:${p.id}`;
const selectCls = "min-h-11 rounded-button border-2 border-radar-purple/25 bg-white px-3 text-[15px] font-bold";

/**
 * Access = "All profiles in this dashboard" (one role, includes profiles added
 * later) or "Selected profiles only" (a role per ticked profile).
 */
function AccessFields({ shareable, initial, error }: { shareable: ManagedProfile[]; initial?: TeamMember; error?: string }) {
  const id = useId();
  const [scope, setScope] = useState<"all" | "selected">(initial?.scope ?? "selected");
  const [picked, setPicked] = useState<Set<string>>(() => new Set((initial?.access ?? []).map(keyOf)));
  const [roles, setRoles] = useState<Record<string, Role>>(() => Object.fromEntries((initial?.access ?? []).map((a) => [keyOf(a), a.role])));
  const allPicked = shareable.length > 0 && shareable.every((p) => picked.has(keyOf(p)));

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? `${id}-err` : undefined}>
      <legend className={`${labelCls} mb-1`}>Access</legend>
      <label className="flex min-h-11 items-start gap-3 rounded-button border-2 border-radar-purple/15 p-3 has-[:checked]:border-radar-purple">
        <input type="radio" name="scope" value="all" checked={scope === "all"} onChange={() => setScope("all")} className="mt-0.5 h-5 w-5 shrink-0 accent-radar-purple" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="font-extrabold">All profiles in this dashboard</span>
          <span className="text-sm text-radar-purple/75">One role for every profile you are admin of, including profiles you add later.</span>
        </span>
      </label>
      {scope === "all" && (
        <div className="-mt-1 flex items-center gap-2 pl-11">
          <label htmlFor={`${id}-all`} className="text-sm font-bold">
            Role
          </label>
          <select id={`${id}-all`} name="all_role" defaultValue={initial?.all_role ?? "moderator"} className={selectCls}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="flex min-h-11 items-start gap-3 rounded-button border-2 border-radar-purple/15 p-3 has-[:checked]:border-radar-purple">
        <input type="radio" name="scope" value="selected" checked={scope === "selected"} onChange={() => setScope("selected")} className="mt-0.5 h-5 w-5 shrink-0 accent-radar-purple" />
        <span className="flex flex-col gap-1">
          <span className="font-extrabold">Selected profiles only</span>
          <span className="text-sm text-radar-purple/75">Tick the profiles and pick a role for each.</span>
        </span>
      </label>
      {scope === "selected" && (
        <div className="flex flex-col gap-1 rounded-button bg-lavender p-3">
          <label className="flex min-h-11 items-center gap-3 text-sm font-extrabold">
            <input
              type="checkbox"
              checked={allPicked}
              onChange={() => setPicked(allPicked ? new Set() : new Set(shareable.map(keyOf)))}
              className="h-5 w-5 accent-radar-purple"
            />
            Select all
          </label>
          {shareable.map((p) => {
            const k = keyOf(p);
            const on = picked.has(k);
            return (
              <div key={k} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <label className="flex min-h-11 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    name="profiles"
                    value={k}
                    checked={on}
                    onChange={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      })
                    }
                    className="h-5 w-5 shrink-0 accent-radar-purple"
                  />
                  <span>
                    <span className="font-bold">{p.name}</span> <span className="text-sm text-radar-purple/70">({p.kind === "group" ? "group" : "comedian"})</span>
                  </span>
                </label>
                {on && (
                  <>
                    <label htmlFor={`${id}-${k}`} className="sr-only">
                      Role for {p.name}
                    </label>
                    <select
                      id={`${id}-${k}`}
                      name={`role_${k}`}
                      value={roles[k] ?? "moderator"}
                      onChange={(e) => setRoles((r) => ({ ...r, [k]: e.target.value as Role }))}
                      className={selectCls}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p id={`${id}-err`} className={errorCls}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** The invite panel. */
export function InviteForm({ shareable }: { shareable: ManagedProfile[] }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(inviteMember, {});
  const id = useId();
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className={labelCls}>
          Email
        </label>
        <input
          key={state.attempt ?? 0}
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          maxLength={200}
          defaultValue={state.ok ? "" : (state.email ?? "")}
          aria-invalid={e.email ? true : undefined}
          aria-describedby={e.email ? `${id}-err` : undefined}
          className={inputCls}
        />
        {e.email && (
          <p id={`${id}-err`} className={errorCls}>
            {e.email}
          </p>
        )}
      </div>
      <AccessFields shareable={shareable} error={e.access} />
      <p className="text-sm text-radar-purple/75">
        Only profiles where you are Admin can be shared. A group does not include its members&apos; solo profiles.
      </p>
      <FormMessage message={state.message} tone={state.ok ? "ok" : "error"} />
      <button type="submit" disabled={pending} className={`${yellowBtn} self-start`}>
        {pending ? "Creating…" : "Create invitation"}
      </button>
    </form>
  );
}

/** "Edit access" for a member or an open invitation. */
export function EditAccessForm({ member, shareable }: { member: TeamMember; shareable: ManagedProfile[] }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(updateAccess, {});
  return (
    <form action={action} className="flex flex-col gap-3 pt-2" noValidate>
      <input type="hidden" name="member_id" value={member.id} />
      <AccessFields shareable={shareable} initial={member} error={state.errors?.access} />
      <FormMessage message={state.message} tone={state.ok ? "ok" : "error"} />
      <button type="submit" disabled={pending} className={`${outlineBtn} self-start`}>
        {pending ? "Saving…" : "Save access"}
      </button>
    </form>
  );
}

/** Accept or decline an invitation. */
export function AnswerForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AnswerState, FormData>(answerInvite, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage message={state.message} />
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" name="answer" value="accept" disabled={pending} className={`${yellowBtn} min-h-12 px-6`}>
          {pending ? "Saving…" : "Accept and join"}
        </button>
        <button type="submit" name="answer" value="decline" disabled={pending} className={`${outlineBtn} min-h-12 px-6`}>
          Decline
        </button>
      </div>
    </form>
  );
}
