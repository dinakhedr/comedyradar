/**
 * FAQ content (spec 7.5 item 2). Answers are plain text; a link in an answer is
 * written as [label](/path) and turned into a link on the page.
 */
export type FaqTopic = "finding" | "tickets" | "creators" | "corrections";

export const FAQ_TOPICS: { value: FaqTopic; label: string }[] = [
  { value: "finding", label: "Finding shows" },
  { value: "tickets", label: "Tickets" },
  { value: "creators", label: "For comedians and managers" },
  { value: "corrections", label: "Corrections and removal" },
];

export type FaqItem = { id: string; topic: FaqTopic; q: string; a: string[] };

export const FAQ: FaqItem[] = [
  {
    id: "where-from",
    topic: "finding",
    q: "Where does the information come from?",
    a: [
      "We gather show details from comedians', groups' and venues' public accounts, mainly Instagram. Comedians and managers also list their own shows on Comedy Radar.",
      "Every show keeps a link to where it came from and to the official ticket seller.",
    ],
  },
  {
    id: "cities",
    topic: "finding",
    q: "Which cities do you cover?",
    a: [
      "Every city in Egypt with live stand-up comedy. Use the city menu on the homepage to see the shows near you.",
      "We also list Egyptian comedians performing abroad (On tour) and comedians from other countries performing in Egypt (Visiting).",
    ],
  },
  {
    id: "signals",
    topic: "finding",
    q: "What do the signals mean?",
    a: [
      "New Signal: the show was just added.",
      "Strong Signal: tickets are selling fast.",
      "Fading Signal: the last tickets are left.",
      "Within range: shows in the city you picked in the city menu.",
    ],
  },
  {
    id: "follow",
    topic: "finding",
    q: "How do I follow a comedian or hear about new shows?",
    a: [
      "Join the newsletter at the bottom of any page: new shows and tours arrive in your inbox every Thursday. You can also follow us on Instagram @comedy_radar.",
    ],
  },
  {
    id: "sell-tickets",
    topic: "tickets",
    q: "Do you sell tickets?",
    a: [
      'No. Comedy Radar lists shows. "Get tickets" takes you to the official seller chosen by the comedian or venue, and you buy your ticket there.',
    ],
  },
  {
    id: "no-prices",
    topic: "tickets",
    q: "Why are there no prices on the show cards?",
    a: [
      "Prices change and can differ between sellers, so we show them only on the show page, as a range. The final price is the one on the ticket seller's site.",
    ],
  },
  {
    id: "sold-out",
    topic: "tickets",
    q: "A show is sold out. What can I do?",
    a: [
      "Check the comedian's or group's page for their next shows, and follow their Instagram: extra dates are often added when a show sells out.",
    ],
  },
  {
    id: "list-shows",
    topic: "creators",
    q: "How do I list my shows?",
    a: [
      "Create a free account on [List your shows](/for-comedians), then create or claim your profile. You can add shows and tours from your dashboard.",
      "Shows from verified profiles appear at once. Shows from new profiles are checked by Comedy Radar first.",
    ],
  },
  {
    id: "claim",
    topic: "creators",
    q: "My page already exists. How do I claim it?",
    a: [
      'Sign in, go to [Claim your profile](/dashboard/profiles/new), search for your name and choose "Claim". Pick one proof, for example a message from your Instagram account. We check it and give you access.',
    ],
  },
  {
    id: "several",
    topic: "creators",
    q: "Can one account manage several comedians or a group?",
    a: [
      "Yes. A manager or agent can manage several comedians and groups with one account, and invite team members with their own role on each profile.",
      "A comedian can also have their own account and manage their page alongside their manager.",
    ],
  },
  {
    id: "verified",
    topic: "creators",
    q: "What does Verified mean?",
    a: [
      "A verified profile is managed by the comedian, the group or their team, and Comedy Radar has checked who they are. Verified profiles publish shows without waiting for review.",
    ],
  },
  {
    id: "spotlight",
    topic: "creators",
    q: "How does a show get into the Spotlight?",
    a: [
      "Comedy Radar picks the Spotlight shows at the top of the homepage. To suggest a show, [send us a message](/contact?topic=partnership).",
    ],
  },
  {
    id: "wrong-detail",
    topic: "corrections",
    q: "A detail is wrong, or the show was cancelled.",
    a: [
      'Use "Report a correction" on the show page or [send us a message](/contact?topic=wrong_detail) with the link to the show. We fix it as soon as we can check it.',
    ],
  },
  {
    id: "remove",
    topic: "corrections",
    q: "How do I update or remove my profile or photo?",
    a: [
      "If you manage the page, sign in and edit it from your dashboard. If you don't, [send us a message](/contact?topic=update_or_remove) with the link to the page and what you want changed or removed. We act on every request.",
    ],
  },
];

/** Lower-case, accent-free text for searching. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

/** The questions that match a search and topic, in their usual order. */
export function filterFaq(
  items: FaqItem[],
  q: string,
  topic: FaqTopic | "" = "",
): FaqItem[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    if (topic && it.topic !== topic) return false;
    if (words.length === 0) return true;
    const text = norm(`${it.q} ${it.a.join(" ")}`);
    return words.every((w) => text.includes(w));
  });
}

/** Splits an answer into text and [label](/path) links. Only site paths become links. */
export function answerParts(
  a: string,
): ({ text: string } | { label: string; href: string })[] {
  const out: ({ text: string } | { label: string; href: string })[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  for (let m = re.exec(a); m; m = re.exec(a)) {
    if (m.index > last) out.push({ text: a.slice(last, m.index) });
    out.push({ label: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < a.length) out.push({ text: a.slice(last) });
  return out;
}
