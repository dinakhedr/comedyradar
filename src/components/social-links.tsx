import type { Socials } from "@/lib/data/group";

const LABELS: [keyof Socials, string][] = [
  ["instagram_url", "Instagram"],
  ["tiktok_url", "TikTok"],
  ["youtube_url", "YouTube"],
  ["facebook_url", "Facebook"],
];

/** Links to a profile's own accounts. Only the ones that exist are shown. */
export function SocialLinks({ socials, name }: { socials: Socials; name: string }) {
  const links = LABELS.filter(([key]) => !!socials[key]);
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`${name} online`}>
      {links.map(([key, label]) => (
        <li key={key}>
          <a
            href={socials[key]!}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center rounded-button border-2 border-plum-line px-3.5 text-sm font-bold hover:border-spotlight-yellow"
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
