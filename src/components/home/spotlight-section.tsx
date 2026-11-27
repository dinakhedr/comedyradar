import { getHomeSettings, getSpotlight } from "@/lib/data/home";
import { SpotlightCarousel } from "./spotlight-carousel";

export async function SpotlightSection() {
  const settings = await getHomeSettings();
  const slides = await getSpotlight(settings.spotlightSlides);

  // Only shows picked in Admin > Spotlight. Nothing picked: no Spotlight section.
  if (slides.length === 0) return null;

  return (
    <SpotlightCarousel
      autoAdvanceSeconds={settings.spotlightAutoadvanceSeconds}
      slides={slides.map((s) => ({
        show: s.show,
        sponsored:
          s.source === "placement" &&
          Boolean((s.show as { is_paid?: boolean }).is_paid),
        placed: s.source === "placement",
      }))}
    />
  );
}
