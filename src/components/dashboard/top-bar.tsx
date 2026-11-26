import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { profileKey } from "@/lib/dashboard";
import { countIncomingRequests, getMyProfiles, requireAccount } from "@/lib/data/dashboard";
import { ProfileSwitcher } from "./profile-switcher";

/** Top bar: profile switcher, the signed-in account and Sign out. */
export async function TopBar() {
  const [account, profiles] = await Promise.all([requireAccount(), getMyProfiles()]);
  const options = profiles.map((p) => ({ value: profileKey(p), label: `${p.name}${p.kind === "group" ? " (group)" : ""}` }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {options.length > 0 ? (
        <Suspense fallback={<div className="h-11 w-56" />}>
          <ProfileSwitcher options={options} />
        </Suspense>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        <span className="hidden text-sm sm:inline">
          Signed in as <strong>{account.display_name || account.email}</strong>
        </span>
        <form action={signOut}>
          <button type="submit" className="min-h-11 rounded-button border-2 border-radar-purple/20 bg-white px-4 text-sm font-extrabold hover:border-radar-purple">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export async function RequestsCount() {
  const n = await countIncomingRequests();
  if (!n) return null;
  return (
    <span className="relative rounded-full bg-laugh-pink px-2 py-0.5 text-xs font-extrabold text-radar-purple">
      {n}
      <span className="sr-only"> waiting</span>
    </span>
  );
}
