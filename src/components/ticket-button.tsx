import Link from "next/link";
import type { ShowRow } from "@/lib/data/types";
import { ticketsClickEvent } from "@/lib/analytics-events";
import { showHref, ticketLink } from "@/lib/show-display";
import { TrackedLink } from "./analytics/tracked-link";

const sizes = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-5 py-3 text-[15px]",
  lg: "px-6 py-3.5 text-[17px]",
};

/**
 * Yellow "Get tickets" (or outline "Join waitlist" when sold out).
 * Ticket links open the official seller in a new tab and send `get_tickets_click`.
 */
export function TicketButton({
  show,
  size = "sm",
  sponsored = false,
  full = false,
  shortLabels = false,
}: {
  show: ShowRow;
  size?: keyof typeof sizes;
  sponsored?: boolean;
  full?: boolean;
  shortLabels?: boolean;
}) {
  const width = full ? "w-full justify-center" : "";
  if (show.status === "sold_out") {
    return (
      <Link
        href={showHref(show)}
        className={`inline-flex min-h-11 items-center rounded-button border-2 border-spotlight-yellow font-extrabold text-spotlight-yellow hover:bg-spotlight-yellow hover:text-radar-purple ${sizes[size]} ${width}`}
      >
        {shortLabels ? "Waitlist" : "Join waitlist"}
      </Link>
    );
  }
  const link = ticketLink(show);
  const cls = `inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow font-extrabold text-radar-purple hover:bg-white ${sizes[size]} ${width}`;
  if (link.external) {
    return (
      <TrackedLink
        href={link.href}
        target="_blank"
        rel={sponsored ? "noopener sponsored" : "noopener"}
        data-ticket-show={show.id}
        className={cls}
        aria-label={`Get tickets for ${show.title}`}
        event={ticketsClickEvent({
          id: show.id,
          title: show.title,
          performer: show.headliner_name,
          city: show.city_name,
          zone: show.zone,
          ticketUrl: show.ticket_url,
        })}
      >
        Get tickets
      </TrackedLink>
    );
  }
  return (
    <Link href={link.href} className={cls} aria-label={`Get tickets for ${show.title}`}>
      Get tickets
    </Link>
  );
}
