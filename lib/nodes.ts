export type VibeNode = {
  id: string;
  kind: "cafe" | "library";
  name: string;
  /** Google Places ID — the source of truth for where this spot is. */
  placeId: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  demographic: string;
  tags: string[];
  crowd: string;
  color: string;
};

export const NODES: VibeNode[] = [
  {
    kind: "cafe",
    id: "cafe-ion",
    name: "Cafe Ion",
    placeId: "ChIJBzrhTQC_QIYRJOLjELLkiHQ",
    address: "4201 Main St Ste 110, Houston, TX 77002",
    neighborhood: "Midtown · The Ion",
    lat: 29.7343,
    lng: -95.38224,
    demographic: "Founders & Co-working Nights",
    tags: ["Founders", "Builders", "Startup events"],
    crowd:
      "Inside The Ion, Houston's innovation hub: tech founders, builders, and co-workers drifting in from startup events.",
    color: "#a78bfa",
  },
  {
    kind: "cafe",
    id: "brass-tacks",
    name: "Brass Tacks",
    placeId: "ChIJCZ44dX-_QIYR2UJJ-nkD_qY",
    address: "612 Live Oak St, Houston, TX 77003",
    neighborhood: "EaDo",
    lat: 29.75146,
    lng: -95.34944,
    demographic: "Mid-20s Remote Tech & Creatives",
    tags: ["Remote eng", "Creatives", "Outlets galore"],
    crowd: "Huge warehouse space, tons of outlets, remote engineers grinding.",
    color: "#22d3ee",
  },
  {
    kind: "cafe",
    id: "agora",
    name: "Agora",
    placeId: "ChIJ3VUwj5nAQIYRlAd40VjiTDA",
    address: "1712 Westheimer Rd, Houston, TX 77098",
    neighborhood: "Montrose / Westheimer",
    lat: 29.74294,
    lng: -95.40261,
    demographic: "Late-20s Creatives & Night Owls",
    tags: ["Creatives", "Night owls", "Loud"],
    crowd:
      "Moody, eclectic 2-story Westheimer spot, chaotic creative energy, bad for quiet calls.",
    color: "#f472b6",
  },
  {
    kind: "cafe",
    id: "siphon",
    name: "Siphon Coffee",
    placeId: "ChIJ27_1pGS_QIYRJB3FWgFpN70",
    address: "701 W Alabama St, Houston, TX 77006",
    neighborhood: "West Alabama",
    lat: 29.73838,
    lng: -95.38825,
    demographic: "25-32 Professionals & Casual Mix",
    tags: ["Professionals", "Patio", "Coffee meetings"],
    crowd: "Patio seating, coffee meetings, remote workers.",
    color: "#fbbf24",
  },
  {
    kind: "cafe",
    id: "croissant-brioche",
    name: "Croissant-Brioche",
    placeId: "ChIJiYS_lV3AQIYRnZ65jPAAZu0",
    address: "2435 Rice Boulevard, Houston, TX 77005",
    neighborhood: "Rice Village",
    lat: 29.71728,
    lng: -95.41625,
    demographic: "19-24 Rice Students & Academics",
    tags: ["Undergrads", "Grad students", "Study groups"],
    crowd: "Undergrads, grad students, study groups.",
    color: "#34d399",
  },
  {
    kind: "cafe",
    id: "empire-cafe",
    name: "Empire Café",
    placeId: "ChIJp9YS95nAQIYRYQP5SNw4_7Y",
    address: "1732 Westheimer Rd, Houston, TX 77098",
    neighborhood: "Montrose / Westheimer",
    lat: 29.74288,
    lng: -95.40359,
    demographic: "Brunch Crowd & Montrose Regulars",
    tags: ["Brunch", "Desserts", "Patio"],
    crowd:
      "Montrose institution in a renovated gas station: huge breakfasts, rich desserts, busy patio, more social than heads-down work.",
    color: "#fb923c",
  },
  {
    kind: "cafe",
    id: "haraz-sugar-land",
    name: "Haraz Coffee House",
    placeId: "ChIJETkDjLvhQIYRKHn7nAnN_TU",
    address: "13582 University Blvd Ste 100, Sugar Land, TX 77479",
    neighborhood: "Sugar Land",
    lat: 29.58346,
    lng: -95.64881,
    demographic: "Yemeni Coffee & Late Hangouts",
    tags: ["Yemeni coffee", "Groups", "Open till 10"],
    crowd:
      "Yemeni coffee house on University Blvd: cardamom coffee and adeni chai, groups hanging out and students studying into the evening.",
    color: "#e879f9",
  },
  {
    kind: "cafe",
    id: "coffee-house-west-end",
    name: "The Coffee House at West End",
    placeId: "ChIJmVkfl7LBQIYR9DhGXU3FnkE",
    address: "802 Shepherd Dr, Houston, TX 77007",
    neighborhood: "West End · Shepherd",
    lat: 29.76931,
    lng: -95.40889,
    demographic: "Med Students & Deep Focus",
    tags: ["3 floors", "Silent top floor", "Med students"],
    crowd:
      "Three floors on Shepherd; the top floor is for super quiet work, and lots of med students camp out studying.",
    color: "#60a5fa",
  },
  {
    kind: "library",
    id: "fondren-library",
    name: "Fondren Library",
    placeId: "ChIJH47xt2TAQIYR_KMXFghaKZI",
    address: "6100 South Main Street, Houston, TX 77005",
    neighborhood: "Rice University",
    lat: 29.71812,
    lng: -95.40009,
    demographic: "Rice Students & Researchers",
    tags: ["Library", "Quiet floors", "Study rooms"],
    crowd: "Rice's main library: undergrads, grad students and researchers in heads-down study mode.",
    color: "#38bdf8",
  },
  {
    kind: "library",
    id: "doherty-library",
    name: "Doherty Library",
    placeId: "ChIJ76aHT32_QIYRgDs7nSNVPks",
    address: "1100 W Main St, Houston, TX 77006",
    neighborhood: "University of St. Thomas · Montrose",
    lat: 29.73643,
    lng: -95.39313,
    demographic: "UST Students & Quiet Study",
    tags: ["Library", "Small campus", "Quiet"],
    crowd: "University of St. Thomas library in Montrose: smaller, calmer campus study crowd.",
    color: "#a3e635",
  },
  {
    kind: "library",
    id: "md-anderson-library",
    name: "M.D. Anderson Library",
    placeId: "ChIJL1Kii3TAQIYROpx-KeUMPyo",
    address: "4333 University Dr, Houston, TX 77204",
    neighborhood: "University of Houston",
    lat: 29.72108,
    lng: -95.34205,
    demographic: "UH Students & Big Study Sessions",
    tags: ["Library", "Huge space", "Group study"],
    crowd: "UH's main library: big, busy campus study hub with everything from group cram sessions to quiet floors.",
    color: "#f87171",
  },
];

export function googleMapsUrl(node: VibeNode) {
  const query = encodeURIComponent(`${node.name}, ${node.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${node.placeId}`;
}
