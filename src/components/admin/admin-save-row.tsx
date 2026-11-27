"use client";

import { labelCls } from "@/components/auth/field-classes";
import { yellowBtn } from "@/components/dashboard/ui";
import { SubmitButton } from "@/components/submit-button";

export const ADMIN_NEW_STATUSES = [
  { value: "published", label: "Published" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
] as const;

/**
 * The end of an Admin "Add new …" form: pick the status (Published by
 * default, so it goes live at once without the Review queue) and save.
 */
export function AdminSaveRow({
  noun,
  pending,
  defaultStatus,
  extraStatuses = [],
  editing = false,
}: {
  noun: string;
  pending?: boolean;
  defaultStatus?: string;
  /** More statuses to offer when editing (for example Sold out, Cancelled). */
  extraStatuses?: readonly { value: string; label: string }[];
  /** Editing something that exists: the button says "Save changes". */
  editing?: boolean;
}) {
  const statuses = [...ADMIN_NEW_STATUSES, ...extraStatuses];
  const start = statuses.some((s) => s.value === defaultStatus) ? defaultStatus : "published";
  return (
    <div className="flex flex-col gap-4 rounded-card bg-white p-4 md:p-6">
      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelCls} mb-1.5`}>Status</legend>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <label
              key={s.value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-button border-2 border-radar-purple/25 px-3.5 font-extrabold has-checked:border-radar-purple has-checked:bg-lavender"
            >
              <input type="radio" name="status" value={s.value} defaultChecked={s.value === start} className="h-4 w-4 accent-radar-purple" />
              {s.label}
            </label>
          ))}
        </div>
        <p className="text-sm text-radar-purple/75">
          Published goes live at once, with no Review queue. Pending waits in the Review queue. Draft stays hidden.
        </p>
      </fieldset>
      <SubmitButton type="submit" disabled={pending} className={`${yellowBtn} min-h-12 self-start px-6`}>
        {editing ? "Save changes" : `Save ${noun}`}
      </SubmitButton>
    </div>
  );
}
