import Link from "next/link";
import { pageList } from "@/lib/shows-filters";

const step = "inline-flex min-h-11 items-center rounded-button border-2 px-4 text-[15px]";
const live = `${step} border-spotlight-yellow font-extrabold text-spotlight-yellow hover:bg-spotlight-yellow hover:text-radar-purple`;
const dead = `${step} border-plum-line font-bold text-lavender-text`;

/** Previous · page numbers · Next (mobile: "Page 1 of N" with Prev / Next). */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const prevLabel = (
    <>
      ‹ <span className="ml-1 md:hidden">Prev</span>
      <span className="ml-1 hidden md:inline">Previous</span>
    </>
  );
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 pt-2 md:justify-center">
      {page > 1 ? (
        <Link href={href(page - 1)} className={live}>
          {prevLabel}
        </Link>
      ) : (
        <span className={dead} aria-disabled="true">
          {prevLabel}
        </span>
      )}
      <span className="text-sm font-bold md:hidden">
        Page {page} of {pages}
      </span>
      <ul className="hidden items-center gap-2 md:flex">
        {pageList(page, pages).map((n, i) =>
          n === "…" ? (
            <li key={`gap${i}`} className="px-1 text-lavender-text" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                aria-label={`Page ${n}`}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-button border-2 px-3 text-[15px] font-extrabold ${
                  n === page
                    ? "border-spotlight-yellow bg-spotlight-yellow text-radar-purple"
                    : "border-plum-line text-white hover:border-spotlight-yellow"
                }`}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ul>
      {page < pages ? (
        <Link href={href(page + 1)} className={live}>
          Next ›
        </Link>
      ) : (
        <span className={dead} aria-disabled="true">
          Next ›
        </span>
      )}
    </nav>
  );
}
