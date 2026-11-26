"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ChevronDown, CloseIcon } from "../icons";

export type NavOption = { value: string; label: string; href: string; group?: string };

const selectBase =
  "min-h-11 w-full cursor-pointer appearance-none rounded-button border-2 border-plum-line bg-radar-purple py-2 pr-9 pl-4 text-[15px] font-bold text-white hover:border-spotlight-yellow focus-visible:border-spotlight-yellow";

/** A dropdown that opens the address of the picked option (filters live in the URL). */
export function NavSelect({
  id,
  label,
  value,
  options,
  srOnlyLabel = true,
  className = "",
  selectClassName = "",
}: {
  id: string;
  label: string;
  value: string;
  options: NavOption[];
  srOnlyLabel?: boolean;
  className?: string;
  selectClassName?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  const groups = [...new Set(options.map((o) => o.group).filter(Boolean))] as string[];
  const opt = (o: NavOption) => (
    <option key={`${o.group ?? ""}${o.value}`} value={o.value} className="bg-radar-purple">
      {o.label}
    </option>
  );

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <label htmlFor={id} className={srOnlyLabel ? "sr-only" : "shrink-0 text-[15px] font-bold"}>
        {label}
      </label>
      <div className="relative w-full">
        <select
          id={id}
          value={shown}
          aria-busy={pending || undefined}
          onChange={(e) => {
            const next = e.target.value;
            const href = options.find((o) => o.value === next)?.href;
            if (href)
              start(() => {
                setShown(next);
                router.push(href, { scroll: false });
              });
          }}
          className={`${selectBase} ${selectClassName}`}
        >
          {options.filter((o) => !o.group).map(opt)}
          {groups.map((g) => (
            <optgroup key={g} label={g} className="bg-radar-purple">
              {options.filter((o) => o.group === g).map(opt)}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-spotlight-yellow" />
      </div>
    </div>
  );
}

/** "Hide sold out": a checkbox that switches between two addresses. */
export function NavCheckbox({ id, label, checked, href }: { id: string; label: string; checked: boolean; href: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(checked);
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] font-bold">
      <input
        id={id}
        type="checkbox"
        checked={shown}
        aria-busy={pending || undefined}
        onChange={() =>
          start(() => {
            setShown(!checked);
            router.push(href, { scroll: false });
          })
        }
        className="h-5 w-5 accent-spotlight-yellow"
      />
      {label}
    </label>
  );
}

/** Mobile "Filters (N)" button with a bottom sheet holding the Where and More filters. */
export function FilterSheet({ count, children }: { count: number; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-button border-2 bg-radar-plum px-3 text-sm font-extrabold ${
          count > 0 ? "border-spotlight-yellow" : "border-plum-line"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6 H20 M7 12 H17 M10 18 H14" />
        </svg>
        Filters{count > 0 ? ` (${count})` : ""}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A click on the dark backdrop closes the sheet. Filters picked inside apply right away.
          if (e.target === dialog.current) setOpen(false);
        }}
        aria-labelledby="filter-sheet-title"
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-[24px] bg-radar-purple p-0 text-white backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-5 px-[18px] pt-4 pb-8">
          <div className="flex items-center justify-between">
            <h2 id="filter-sheet-title" className="font-display text-[26px]">
              Filters
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="flex h-11 w-11 items-center justify-center rounded-button bg-radar-plum"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-12 rounded-button bg-spotlight-yellow text-base font-extrabold text-radar-purple"
          >
            Show results
          </button>
        </div>
      </dialog>
    </>
  );
}
