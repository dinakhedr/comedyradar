"use client";

import { useId, useMemo, useRef, useState } from "react";
import { inputCls } from "@/components/auth/field-classes";
import type { ManagedProfile } from "@/lib/dashboard";
import { filterPerformers } from "@/lib/performer-search";

const keyOf = (p: Pick<ManagedProfile, "kind" | "id">) => `${p.kind === "group" ? "g" : "c"}:${p.id}`;
const kindLabel = (p: Pick<ManagedProfile, "kind">) => (p.kind === "group" ? "group" : "comedian");
const MAX_SHOWN = 50;

/**
 * Pick one comedian or group by typing part of the name (a searchable menu
 * instead of a long dropdown). Sends `name` = "c:<id>" or "g:<id>" like the
 * old select did.
 */
export function PerformerPicker({
  id,
  name,
  profiles,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  id: string;
  name: string;
  profiles: ManagedProfile[];
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  const listId = useId();
  const selected = profiles.find((p) => keyOf(p) === value) ?? null;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => filterPerformers(profiles, q).slice(0, MAX_SHOWN), [profiles, q]);

  const pick = (p: ManagedProfile) => {
    onChange(keyOf(p));
    setQ("");
    setOpen(false);
  };

  // While the menu is closed the box shows the chosen name; typing searches.
  const shown = open ? q : selected ? `${selected.name} (${kindLabel(selected)})` : "";

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          placeholder={selected ? "Type to search another name" : "Type a comedian or group name"}
          value={shown}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setOpen(false)}
          onChange={(ev) => {
            setQ(ev.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(ev) => {
            if (ev.key === "ArrowDown") {
              ev.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (ev.key === "ArrowUp") {
              ev.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (ev.key === "Enter") {
              // Enter picks the highlighted name instead of sending the form.
              if (open) {
                ev.preventDefault();
                if (matches[active]) pick(matches[active]);
              }
            } else if (ev.key === "Escape") {
              setQ("");
              setOpen(false);
            }
          }}
          className={`${inputCls} appearance-none pr-12`}
        />
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-radar-purple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Comedians and groups"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-button border-2 border-radar-purple/25 bg-white py-1 text-radar-purple shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm font-bold">No comedian or group found with this name.</li>
          ) : (
            matches.map((p, i) => (
              <li
                key={keyOf(p)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={keyOf(p) === value}
                // mousedown, so the pick happens before the box loses focus.
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  pick(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 ${i === active ? "bg-lavender" : ""}`}
              >
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-radar-purple text-sm font-extrabold text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 font-bold break-words">{p.name}</span>
                <span className="shrink-0 text-sm text-radar-purple/70">{kindLabel(p)}</span>
                {keyOf(p) === value && (
                  <span aria-hidden="true" className="shrink-0 font-extrabold text-[#157A3F]">
                    ✓
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
