"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { trackSpotlightClick } from "@/lib/analytics";
import type { ShowRow } from "@/lib/data/types";
import { formatShowDate } from "@/lib/dates";
import {
  performerHref,
  showHref,
  signalBadge,
  typeBadge,
} from "@/lib/show-display";
import { Badge } from "../badge";
import { ChevronLeft, ChevronRight } from "../icons";
import { PosterImage } from "../placeholder-image";
import { sendStat } from "../page-tracker";
import { TicketButton } from "../ticket-button";

export type SpotlightSlideData = {
  show: ShowRow;
  sponsored: boolean;
  placed?: boolean;
};

/**
 * Spotlight carousel (spec 5.3): one full-width slide at a time, counter,
 * arrows, dots and swipe. Auto-advances every few seconds; pauses on hover,
 * keyboard focus and when the tab is hidden; stops for good once the visitor
 * uses the arrows, dots or swipes; never moves with "reduced motion" on.
 */
export function SpotlightCarousel({
  slides,
  autoAdvanceSeconds,
}: {
  slides: SpotlightSlideData[];
  autoAdvanceSeconds: number;
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mq.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const autoPlaying = count > 1 && !stopped && !reducedMotion;
  const paused = hovered || focused || hidden;

  useEffect(() => {
    if (!autoPlaying || paused) return;
    const t = window.setTimeout(
      () => setIndex((i) => (i + 1) % count),
      autoAdvanceSeconds * 1000,
    );
    return () => window.clearTimeout(t);
  }, [autoPlaying, paused, index, count, autoAdvanceSeconds]);

  const go = useCallback(
    (next: number) => {
      setStopped(true);
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  // Spotlight placements count a view the first time their slide shows in this tab (spec 9, rule 8).
  const seen = useRef(new Set<string>());
  const current = slides[index];
  useEffect(() => {
    if (!current?.placed || hidden || seen.current.has(current.show.id)) return;
    seen.current.add(current.show.id);
    sendStat("spotlight_view", current.show.id);
  }, [current, hidden]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby="spotlight-title"
      className="mx-auto flex max-w-[1280px] flex-col gap-3.5 px-[18px] pb-7 md:gap-5 md:px-8 md:pb-14"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocused(false);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5 md:gap-3.5">
          <h2
            id="spotlight-title"
            className="font-display text-[28px] md:text-[40px]"
          >
            Spotlight
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="text-[13px] font-bold text-lavender-text md:text-small"
            aria-hidden
          >
            {index + 1} / {count}
          </span>
          {count > 1 && (
            <div className="hidden items-center gap-2.5 md:flex">
              <ArrowButton direction="prev" onClick={() => go(index - 1)} />
              <ArrowButton direction="next" onClick={() => go(index + 1)} />
            </div>
          )}
        </div>
      </div>

      <div
        aria-live={autoPlaying ? "off" : "polite"}
        onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(dx) > 40 && count > 1)
            go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        {slides.map((slide, i) => (
          <Slide
            key={slide.show.id}
            slide={slide}
            position={i + 1}
            total={count}
            active={i === index}
          />
        ))}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-between md:justify-center">
          <div className="md:hidden">
            <ArrowButton direction="prev" onClick={() => go(index - 1)} />
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.show.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1} of ${count}`}
                aria-current={i === index ? "true" : undefined}
                className="flex h-11 items-center justify-center px-0.5"
              >
                <span
                  className={`block h-2 rounded-full transition-all ${
                    i === index ? "w-7 bg-spotlight-yellow" : "w-2 bg-plum-line"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="md:hidden">
            <ArrowButton direction="next" onClick={() => go(index + 1)} />
          </div>
        </div>
      )}
    </section>
  );
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const next = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={next ? "Next show" : "Previous show"}
      className={`flex h-11 w-11 items-center justify-center rounded-full ${
        next
          ? "bg-spotlight-yellow text-radar-purple hover:bg-white"
          : "border-2 border-plum-line text-white hover:border-spotlight-yellow"
      }`}
    >
      {next ? <ChevronRight /> : <ChevronLeft />}
    </button>
  );
}

function Slide({
  slide,
  position,
  total,
  active,
}: {
  slide: SpotlightSlideData;
  position: number;
  total: number;
  active: boolean;
}) {
  const { show } = slide;
  const signal = signalBadge(show);
  const type = typeBadge(show);
  const performer = performerHref(show);
  const place = [show.venue_name, show.city_name].filter(Boolean).join(", ");

  return (
    <article
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      hidden={!active}
      // Any link on the slide (title, performer, Get tickets, Show details) counts as a Spotlight click.
      onClickCapture={(e) => {
        if (!(e.target as HTMLElement).closest("a")) return;
        trackSpotlightClick(show.id, position);
        if (slide.placed) sendStat("spotlight_click", show.id);
      }}
      className="overflow-hidden rounded-[22px] bg-radar-plum md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:rounded-spotlight"
    >
      {/* The frame has the shape of the standard wide poster (1376 × 768), so it fills exactly; a tall one sits in the middle with a blurred fill. */}
      <PosterImage
        src={show.poster_url}
        alt=""
        iconSize={96}
        eager={position === 1}
        className="aspect-[1376/768] w-full md:self-center"
      />
      <div className="flex flex-col justify-center gap-2 p-[18px] md:gap-3.5 md:px-11 md:py-10">
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {signal && (
            <Badge tone={signal.tone} size="md">
              {signal.label}
            </Badge>
          )}
          <Badge tone={type.tone} size="md">
            {type.label}
          </Badge>
        </div>
        <h3 className="font-display text-[28px] leading-[1.05] md:text-display-lg">
          <Link href={showHref(show)} className="hover:text-spotlight-yellow">
            {show.title}
          </Link>
        </h3>
        {show.headliner_name && (
          <p className="text-base font-extrabold text-spotlight-yellow md:text-xl">
            {performer ? (
              <Link href={performer} className="hover:underline">
                {show.headliner_name}
              </Link>
            ) : (
              show.headliner_name
            )}
          </p>
        )}
        <p className="text-small text-lavender-text md:text-[17px] md:leading-relaxed">
          {formatShowDate(new Date(show.starts_at))}
          <span className="md:hidden"> · {place}</span>
          <span className="hidden md:block">{place}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-3 md:mt-2.5">
          <div className="w-full md:w-auto">
            <TicketButton
              show={show}
              size="lg"
              sponsored={slide.sponsored}
              full
            />
          </div>
          <Link
            href={showHref(show)}
            className="hidden min-h-11 items-center rounded-button border-2 border-plum-line px-5 py-3 font-bold hover:border-spotlight-yellow md:inline-flex"
          >
            Show details
          </Link>
        </div>
      </div>
    </article>
  );
}
