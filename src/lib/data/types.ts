export type ShowRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  status: "published" | "sold_out";
  zone: "local" | "outbound" | "inbound";
  display_signal: "none" | "new" | "strong" | "fading";
  ticket_url: string | null;
  poster_url: string | null;
  tour_id: string | null;
  city_name: string;
  city_slug: string;
  country_code: string;
  venue_name: string | null;
  headliner_type: "comedian" | "group" | null;
  headliner_name: string | null;
  headliner_slug: string | null;
  headliner_photo_url: string | null;
  comedian_ids: string[];
  group_ids: string[];
  performer_count: number;
};

export type TourRow = {
  id: string;
  slug: string;
  name: string;
  poster_url: string | null;
  owner_type: "comedian" | "group";
  owner_name: string;
  owner_slug: string;
  owner_photo_url: string | null;
  first_show_at: string;
  last_show_at: string;
  next_show_at: string;
  show_count: number;
  country_count: number;
  cities: string[];
  next_city_name?: string | null;
};

export type City = { id: string; name: string; slug: string; country_code: string; country_name: string };

export type TrackItem = {
  kind: "comedian" | "group";
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  member_count: number;
  upcoming_count: number;
  on_tour: boolean;
  created_at: string;
};
