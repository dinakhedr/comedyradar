"use client";

import { useState } from "react";
import { renameCity } from "@/app/actions/admin-settings";
import { CloseIcon, EditIcon, SaveIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";

const iconBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-radar-purple hover:bg-radar-purple/10 focus-visible:outline-2 focus-visible:outline-radar-purple";

/** One city in Settings > Countries and cities. The pencil turns the name into a small form to rename it. */
export function CityChip({ id, name, countryCode }: { id: string; name: string; countryCode: string }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <li className="inline-flex items-center gap-0.5 rounded-full bg-lavender py-0.5 pr-0.5 pl-3.5 text-sm font-bold">
        {name}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit the name of ${name}`}
          title="Edit the name"
          className={iconBtn}
        >
          <EditIcon size={16} />
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-full bg-lavender py-0.5 pr-0.5 pl-2">
      <form action={renameCity} className="flex items-center gap-0.5">
        <input type="hidden" name="city_id" value={id} />
        <input type="hidden" name="open" value={countryCode} />
        <label htmlFor={`rc-${id}`} className="sr-only">
          New name for {name}
        </label>
        <input
          id={`rc-${id}`}
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={60}
          autoFocus
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className="h-8 w-40 rounded-full border-2 border-radar-purple/30 bg-white px-3 text-sm font-bold text-radar-purple focus:border-radar-purple focus:outline-none"
        />
        <SubmitButton aria-label={`Save the new name of ${name}`} title="Save" className={iconBtn}>
          <SaveIcon size={16} />
        </SubmitButton>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" title="Cancel" className={iconBtn}>
          <CloseIcon size={16} />
        </button>
      </form>
    </li>
  );
}
