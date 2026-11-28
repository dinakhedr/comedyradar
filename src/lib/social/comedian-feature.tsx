/**
 * Comedian Feature Instagram template (1080 × 1350), drawn with next/og.
 * Every value here comes from docs/social-templates.md: change both together.
 * Satori only understands flexbox and inline styles, so there are no classes.
 */
import { fitFontSize, possessive, splitName } from "./text";

export const FEATURE_SIZE = { width: 1080, height: 1350 } as const;

const PURPLE = "#2B0B4F";
const YELLOW = "#FFD60A";
const PINK = "#FF4D8D";
const PLUM = "#4A1470";
const LAVENDER = "#F1EAFB";

export type FeatureInput = {
  name: string;
  firstName?: string | null;
  /** The comedian photo as a data URL, or null for the placeholder circle. */
  photo: string | null;
  /** The dark horizontal logo SVG as a data URL. */
  logo: string;
};

/** Font sizes and words, worked out before drawing (also used by the tests). */
export function featureLayout(name: string, firstName?: string | null) {
  const { first, last } = splitName(name, firstName);
  const nameSize = fitFontSize([first, last], 104, 72, 936);
  const ctaLine1 = `Find ${possessive(first)} shows`;
  const ctaSize = fitFontSize([ctaLine1], 58, 44, 760);
  return { first, last, nameSize, ctaLine1, ctaLine2: "on our radar", ctaSize };
}

function PersonIcon() {
  return (
    <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke={LAVENDER} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21 A8 8 0 0 1 20 21" />
    </svg>
  );
}

export function ComedianFeature({ name, firstName, photo, logo }: FeatureInput) {
  const l = featureLayout(name, firstName);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: PURPLE,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 72px 220px",
      }}
    >
      {/* 1. Logo row */}
      <div style={{ display: "flex", width: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, not a web page */}
        <img src={logo} alt="" width={520} height={250} style={{ width: 520, height: 250, objectFit: "contain", marginLeft: -48 }} />
      </div>

      {/* 2. Radar block */}
      <div style={{ display: "flex", width: 560, height: 560, marginTop: -56, position: "relative" }}>
        <svg width="560" height="560" viewBox="0 0 560 560" style={{ position: "absolute", left: 0, top: 0 }}>
          <path d="M 280 280 L 280 4 A 276 276 0 0 1 554.9 304.1 Z" fill={YELLOW} opacity="0.12" />
          <line x1="280" y1="0" x2="280" y2="560" stroke={LAVENDER} strokeWidth="2" opacity="0.12" />
          <line x1="0" y1="280" x2="560" y2="280" stroke={LAVENDER} strokeWidth="2" opacity="0.12" />
          <circle cx="280" cy="280" r="227" fill="none" stroke={YELLOW} strokeWidth="4" opacity="0.22" />
          <circle cx="280" cy="280" r="204" fill="none" stroke={PINK} strokeWidth="4" opacity="0.4" />
          <circle cx="425.9" cy="106.1" r="13" fill={PINK} />
          <circle cx="149.8" cy="465.9" r="10" fill={YELLOW} />
          <circle cx="103.3" cy="178.0" r="8" fill={YELLOW} opacity="0.8" />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 100,
            top: 100,
            width: 360,
            height: 360,
            borderRadius: "50%",
            border: `6px solid ${YELLOW}`,
            overflow: "hidden",
            background: PLUM,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, not a web page
            <img src={photo} alt="" width={348} height={348} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : (
            <PersonIcon />
          )}
        </div>
      </div>

      {/* 3. Spacer */}
      <div style={{ display: "flex", height: 20 }} />

      {/* 4. Name */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 936,
          fontFamily: "Luckiest Guy",
          fontSize: l.nameSize,
          lineHeight: 0.92,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", color: "#FFFFFF" }}>{l.first}</div>
        {l.last && <div style={{ display: "flex", justifyContent: "center", color: YELLOW }}>{l.last}</div>}
      </div>

      {/* 5. Yellow CTA band */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 220,
          background: YELLOW,
          padding: "0 72px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Luckiest Guy",
            fontSize: l.ctaSize,
            lineHeight: 1.08,
            textTransform: "uppercase",
            color: PURPLE,
          }}
        >
          <div style={{ display: "flex" }}>{l.ctaLine1}</div>
          <div style={{ display: "flex" }}>{l.ctaLine2}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            width: 112,
            height: 112,
            borderRadius: "50%",
            background: PURPLE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
