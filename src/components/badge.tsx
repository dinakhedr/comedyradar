export type BadgeTone = "pink" | "yellow" | "purple" | "plum" | "outline";

const tones: Record<BadgeTone, string> = {
  pink: "bg-laugh-pink text-radar-purple font-extrabold",
  yellow: "bg-spotlight-yellow text-radar-purple font-extrabold",
  purple: "bg-radar-purple text-white font-bold",
  plum: "bg-radar-plum text-white font-bold",
  outline: "border border-plum-line text-white font-bold",
};

export function Badge({ tone, children, size = "sm" }: { tone: BadgeTone; children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-block rounded-md tracking-wider uppercase ${tones[tone]} ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-[3px] text-[11px]"
      }`}
    >
      {children}
    </span>
  );
}
