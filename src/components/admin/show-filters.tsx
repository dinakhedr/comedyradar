"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { inputCls } from "@/components/auth/field-classes";
import { ChevronDown } from "@/components/icons";
import { citiesSummary, groupCities, type FilterCity } from "@/lib/admin-shows";
import { flagOf } from "@/lib/countries";
import type { AdminShowComedian } from "@/lib/data/admin";

const MAX_SHOWN = 60;
const menuCls =
  "absolute z-30 mt-1 w-full min-w-72 rounded-button border-2 border-radar-purple/25 bg-white p-2 text-radar-purple shadow-lg";

/** Close a popup when the person clicks or taps outside it. */
function useOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (ev: PointerEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [ref, open, close]);
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Shows the part of a name that matches what was typed in yellow. */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? fold(text).indexOf(fold(q)) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-spotlight-yellow text-radar-purple">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Comedian filter: a searchable menu. Sends `comedian` = id or "". */
export function ComedianFilter({
  id,
  comedians,
  value,
}: {
  id: string;
  comedians: AdminShowComedian[];
  value: string;
}) {
  const listId = useId();
  const [picked, setPicked] = useState(value);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = comedians.find((c) => c.id === picked) ?? null;

  // First option is "All comedians", then the matches.
  const options = useMemo(() => {
    const f = fold(q.trim());
    const hits = f ? comedians.filter((c) => fold(c.name).includes(f)) : comedians;
    return [null, ...hits.slice(0, MAX_SHOWN)] as (AdminShowComedian | null)[];
  }, [comedians, q]);

  const pick = (c: AdminShowComedian | null) => {
    setPicked(c?.id ?? "");
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <input type="hidden" name="comedian" value={picked} />
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        placeholder={open ? "Type a name" : "All comedians"}
        value={open ? q : (selected?.name ?? "")}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setOpen(false)}
        onChange={(ev) => {
          setQ(ev.target.value);
          setOpen(true);
          setActive(ev.target.value.trim() ? 1 : 0);
        }}
        onKeyDown={(ev) => {
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (ev.key === "ArrowUp") {
            ev.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (ev.key === "Enter" && open) {
            // Enter picks the highlighted name instead of sending the form.
            ev.preventDefault();
            if (active < options.length) pick(options[active]);
          } else if (ev.key === "Escape") {
            setQ("");
            setOpen(false);
          }
        }}
        className={`${inputCls} min-h-11 appearance-none pr-10 placeholder:text-radar-purple!`}
      />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-radar-purple">
        <ChevronDown size={18} />
      </span>
      {open && (
        <ul id={listId} role="listbox" aria-label="Comedians" className={`${menuCls} max-h-80 overflow-y-auto`}>
          {options.map((c, i) => (
            <li
              key={c?.id ?? "all"}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={(c?.id ?? "") === picked}
              // mousedown, so the pick happens before the box loses focus.
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${i === active ? "bg-lavender" : ""} ${(c?.id ?? "") === picked ? "font-extrabold" : ""}`}
            >
              {c ? (
                <>
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-radar-purple text-sm font-extrabold text-white">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 break-words">
                    <Highlight text={c.name} q={q.trim()} />
                  </span>
                  <span className="shrink-0 text-xs font-bold text-radar-purple/70">
                    {c.upcoming} upcoming
                  </span>
                </>
              ) : (
                <span className="flex-1">All comedians</span>
              )}
            </li>
          ))}
          {options.length === 1 && (
            <li className="px-2 py-2 text-sm font-bold">No comedian found with this name.</li>
          )}
        </ul>
      )}
    </div>
  );
}

/** A checkbox that can also show a dash (some cities of a country ticked). */
function Check({
  checked,
  mixed,
  label,
  onChange,
}: {
  checked: boolean;
  mixed?: boolean;
  label: string;
  onChange: (on: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!mixed;
  }, [mixed]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(ev) => onChange(ev.target.checked)}
      className="h-5 w-5 shrink-0 cursor-pointer accent-radar-purple"
    />
  );
}

/**
 * Cities filter: countries with their cities as a checklist. Ticking a
 * country ticks all its cities; cities can be ticked one by one across
 * countries. Sends `cities` = "id,id,…" ("" = all cities).
 */
export function CitiesFilter({
  id,
  cities,
  value,
}: {
  id: string;
  cities: FilterCity[];
  value: string[];
}) {
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(value));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const groups = useMemo(() => groupCities(cities), [cities]);
  // Countries with something ticked start opened.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.filter((g) => g.cities.some((c) => value.includes(c.id))).map((g) => g.code)),
  );
  useOutside(wrap, open, () => setOpen(false));

  const f = fold(q.trim());
  const shown = groups
    .map((g) => {
      if (!f || fold(g.name).includes(f)) return g;
      return { ...g, cities: g.cities.filter((c) => fold(c.name).includes(f)) };
    })
    .filter((g) => g.cities.length > 0);

  const setMany = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const i of ids) {
        if (on) next.add(i);
        else next.delete(i);
      }
      return next;
    });
  const toggleOpen = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const list = [...picked];
  const summary = citiesSummary(list, cities);

  return (
    <div ref={wrap} className="relative" onKeyDown={(ev) => ev.key === "Escape" && setOpen(false)}>
      <input type="hidden" name="cities" value={cities.filter((c) => picked.has(c.id)).map((c) => c.id).join(",")} />
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex min-h-11 items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className={`${menuCls} right-0 sm:right-auto sm:w-80`}>
          <label htmlFor={`${panelId}-q`} className="sr-only">
            Find a country or city
          </label>
          <input
            id={`${panelId}-q`}
            type="search"
            autoComplete="off"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && ev.preventDefault()}
            placeholder="Find a country or city"
            className={`${inputCls} mb-1 min-h-11`}
          />
          <ul className="max-h-80 overflow-y-auto" aria-label="Countries and cities">
            {shown.length === 0 && <li className="px-2 py-2 text-sm font-bold">No country or city found.</li>}
            {shown.map((g) => {
              const all = groups.find((x) => x.code === g.code)!.cities;
              const on = all.filter((c) => picked.has(c.id)).length;
              const isOpen = !!f || expanded.has(g.code);
              return (
                <li key={g.code}>
                  <div className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 hover:bg-lavender">
                    <Check
                      label={`All of ${g.name}`}
                      checked={on === all.length}
                      mixed={on > 0 && on < all.length}
                      onChange={(v) => setMany(all.map((c) => c.id), v)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleOpen(g.code)}
                      aria-expanded={isOpen}
                      className="flex min-h-11 flex-1 items-center gap-2 text-left font-extrabold"
                    >
                      <span className="min-w-0 flex-1 break-words">
                        {flagOf(g.code)} {g.name}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-radar-purple/70">
                        {on} of {all.length}
                      </span>
                      <ChevronDown size={16} className={`shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    </button>
                  </div>
                  {isOpen && (
                    <ul>
                      {g.cities.map((c) => (
                        <li key={c.id}>
                          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-2 pl-9 hover:bg-lavender">
                            <input
                              type="checkbox"
                              checked={picked.has(c.id)}
                              onChange={(ev) => setMany([c.id], ev.target.checked)}
                              className="h-5 w-5 shrink-0 cursor-pointer accent-radar-purple"
                            />
                            <span className="break-words">{c.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-radar-purple/10 pt-2">
            <button type="button" onClick={() => setPicked(new Set())} className="min-h-11 px-1 font-extrabold underline">
              Clear all
            </button>
            <button
              type="button"
              onClick={(ev) => {
                setOpen(false);
                // Done applies the filters, like pressing Show.
                const form = ev.currentTarget.closest("form");
                requestAnimationFrame(() => form?.requestSubmit());
              }}
              className="min-h-11 rounded-button bg-spotlight-yellow px-5 font-extrabold text-radar-purple"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
