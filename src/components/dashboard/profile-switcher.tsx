"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type SwitcherOption = { value: string; label: string };

/** "All profiles" or one profile; the choice is kept in the address (?p=). */
export function ProfileSwitcher({ options }: { options: SwitcherOption[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const current = options.some((o) => o.value === params.get("p")) ? params.get("p")! : "";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="profile-switcher" className="text-sm font-extrabold">
        Profile
      </label>
      <select
        id="profile-switcher"
        value={current}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set("p", e.target.value);
          else next.delete("p");
          const qs = next.toString();
          start(() => router.push(qs ? `${path}?${qs}` : path));
        }}
        className="min-h-11 max-w-[220px] rounded-button border-2 border-radar-purple/20 bg-white px-3 text-[15px] font-bold text-radar-purple"
      >
        <option value="">All profiles</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
