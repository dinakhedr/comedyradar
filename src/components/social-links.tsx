import type { ComponentType } from "react";
import type { Socials } from "@/lib/data/group";
import { IconLink } from "./icon-link";
import { FacebookIcon, GlobeIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "./icons";

const LINKS: [keyof Socials, string, ComponentType<{ className?: string; size?: number }>][] = [
  ["website_url", "the web", GlobeIcon],
  ["instagram_url", "Instagram", InstagramIcon],
  ["tiktok_url", "TikTok", TikTokIcon],
  ["youtube_url", "YouTube", YouTubeIcon],
  ["facebook_url", "Facebook", FacebookIcon],
];

/** Icon links to a profile's own accounts. Only the ones that exist are shown. */
export function SocialLinks({ socials, name }: { socials: Socials; name: string }) {
  const links = LINKS.filter(([key]) => !!socials[key]);
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2.5" aria-label={`${name} online`}>
      {links.map(([key, label, Icon]) => (
        <li key={key}>
          <IconLink href={socials[key]!} label={`${name} on ${label}`}>
            <Icon />
          </IconLink>
        </li>
      ))}
    </ul>
  );
}
