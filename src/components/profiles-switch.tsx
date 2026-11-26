import Link from "next/link";

/** The "Comedians (N) | Groups (N)" switch on /comedians and /groups (spec 7.3, 7.4). */
export function ProfilesSwitch({ current, comedians, groups }: { current: "comedians" | "groups"; comedians: number; groups: number }) {
  const tab = (key: "comedians" | "groups", label: string, n: number) => (
    <Link
      href={`/${key}`}
      aria-current={current === key ? "page" : undefined}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-[10px] px-4 text-sm md:flex-none md:px-6 md:text-[15px] ${
        current === key ? "bg-spotlight-yellow font-extrabold text-radar-purple" : "font-bold text-white hover:text-spotlight-yellow"
      }`}
    >
      {label} ({n})
    </Link>
  );
  return (
    <nav aria-label="Comedians or groups" className="flex rounded-[14px] bg-radar-plum p-1">
      {tab("comedians", "Comedians", comedians)}
      {tab("groups", "Groups", groups)}
    </nav>
  );
}
