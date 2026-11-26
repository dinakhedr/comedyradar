/** Listen buttons in the spec's order; only platforms with a link. */
export function podcastLinks(p: {
  apple_podcasts_url: string | null;
  spotify_url: string | null;
  anghami_url: string | null;
  podu_url: string | null;
  youtube_url: string | null;
}) {
  return (
    [
      ["Apple Podcasts", p.apple_podcasts_url],
      ["Spotify", p.spotify_url],
      ["Anghami", p.anghami_url],
      ["podU", p.podu_url],
      ["YouTube", p.youtube_url],
    ] as const
  )
    .filter(([, url]) => !!url)
    .map(([label, url]) => ({ label, url: url! }));
}

