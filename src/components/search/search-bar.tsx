"use client";

import { useRef, useState } from "react";
import { SearchIcon } from "../icons";

/** The search bar on /search: keeps the query, with a clear (×) button (spec 8). */
export function SearchBar({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      action="/search"
      role="search"
      className="flex w-full gap-1.5 rounded-[14px] bg-white p-[5px] md:gap-2 md:rounded-2xl md:p-1.5"
    >
      <label htmlFor="search-q" className="sr-only">
        Search shows, comedians, groups, tours or venues
      </label>
      <input
        ref={input}
        id="search-q"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search a comedian, group, show or venue"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-[10px] px-3 py-3 text-base font-bold text-radar-purple placeholder:font-normal placeholder:text-radar-purple/60 md:px-4 md:py-3.5 md:text-lg [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            input.current?.focus();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-lavender text-xl font-extrabold text-radar-purple hover:bg-lavender-text md:h-12 md:w-12 md:rounded-button"
        >
          ×
        </button>
      )}
      <button
        type="submit"
        aria-label="Scan the radar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-radar-purple text-spotlight-yellow hover:bg-radar-plum md:h-auto md:w-auto md:rounded-button md:px-7 md:py-3.5 md:text-base md:font-extrabold"
      >
        <SearchIcon className="md:hidden" />
        <span className="hidden md:inline">Scan the radar</span>
      </button>
    </form>
  );
}
