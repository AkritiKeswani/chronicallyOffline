export const CITY_IDS = ["htx", "sf", "nyc", "phl", "ldn"] as const;
export type CityId = (typeof CITY_IDS)[number];

export type City = {
  id: CityId;
  name: string;
  short: string;
  /** A few well-known neighborhoods, shown on the landing page. */
  neighborhoods: string[];
  center: { lat: number; lng: number };
  zoom: number;
  timeZone: string;
  /** Max distance (miles) from center for a place to count as "in" the city. */
  radiusMi: number;
};

export const CITIES: Record<CityId, City> = {
  htx: {
    id: "htx",
    name: "Houston",
    short: "HTX",
    neighborhoods: ["Montrose", "The Heights", "EaDo", "Rice Village", "Midtown"],
    center: { lat: 29.742, lng: -95.39 },
    zoom: 13,
    timeZone: "America/Chicago",
    radiusMi: 40,
  },
  sf: {
    id: "sf",
    name: "San Francisco",
    short: "SF",
    neighborhoods: ["Mission", "SoMa", "Hayes Valley", "NoPa", "North Beach"],
    center: { lat: 37.7749, lng: -122.4194 },
    zoom: 13,
    timeZone: "America/Los_Angeles",
    radiusMi: 30,
  },
  nyc: {
    id: "nyc",
    name: "New York",
    short: "NYC",
    neighborhoods: ["West Village", "SoHo", "Williamsburg", "Lower East Side", "Nolita"],
    center: { lat: 40.7282, lng: -73.9942 },
    zoom: 13,
    timeZone: "America/New_York",
    radiusMi: 30,
  },
  phl: {
    id: "phl",
    name: "Philadelphia",
    short: "Philly",
    neighborhoods: ["Fishtown", "Center City", "Rittenhouse", "Old City", "University City"],
    center: { lat: 39.9526, lng: -75.1652 },
    zoom: 13,
    timeZone: "America/New_York",
    radiusMi: 25,
  },
  ldn: {
    id: "ldn",
    name: "London",
    short: "London",
    neighborhoods: ["Shoreditch", "Soho", "Clerkenwell", "Peckham", "Marylebone"],
    center: { lat: 51.5136, lng: -0.0984 },
    zoom: 13,
    timeZone: "Europe/London",
    radiusMi: 25,
  },
};

export function isCityId(value: unknown): value is CityId {
  return typeof value === "string" && (CITY_IDS as readonly string[]).includes(value);
}

/** Local time string in the city's time zone, e.g. "Saturday 2:15 PM". */
export function cityNow(city: City) {
  return new Date().toLocaleString("en-US", {
    timeZone: city.timeZone,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const FIELDS = {
  tech: { label: "Tech", available: true },
  finance: { label: "Finance", available: false },
  fashion: { label: "Fashion", available: false },
  other: { label: "Something else", available: true },
} as const;
export type FieldId = keyof typeof FIELDS;

export const INTERESTS = [
  "AI",
  "Dev tools",
  "Startups",
  "Design",
  "Product",
  "Crypto",
  "Climate",
  "Health tech",
  "Coffee",
  "Co-working",
  "Nightlife",
  "Food",
  "Art & museums",
  "Music",
  "Outdoors",
  "Fitness",
  "Books",
] as const;
