export type VibeNode = {
  id: string;
  name: string;
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
    id: "sohn",
    name: "Sohn Cafe",
    neighborhood: "Downtown",
    lat: 29.7604,
    lng: -95.3698,
    demographic: "Founders & Co-working Nights",
    tags: ["Founders", "Builders", "Evening co-work"],
    crowd: "Tech founders, builders, evening co-working vibes.",
    color: "#a78bfa",
  },
  {
    id: "brass-tacks",
    name: "Brass Tacks",
    neighborhood: "EaDo",
    lat: 29.7516,
    lng: -95.3512,
    demographic: "Mid-20s Remote Tech & Creatives",
    tags: ["Remote eng", "Creatives", "Outlets galore"],
    crowd: "Huge warehouse space, tons of outlets, remote engineers grinding.",
    color: "#22d3ee",
  },
  {
    id: "agora",
    name: "Agora",
    neighborhood: "Montrose / Westheimer",
    lat: 29.7428,
    lng: -95.3999,
    demographic: "Late-20s Creatives & Night Owls",
    tags: ["Creatives", "Night owls", "Loud"],
    crowd:
      "Moody, eclectic 2-story Westheimer spot, chaotic creative energy, bad for quiet calls.",
    color: "#f472b6",
  },
  {
    id: "siphon",
    name: "Siphon Coffee",
    neighborhood: "West Alabama",
    lat: 29.7381,
    lng: -95.3879,
    demographic: "25-32 Professionals & Casual Mix",
    tags: ["Professionals", "Patio", "Coffee meetings"],
    crowd: "Patio seating, coffee meetings, remote workers.",
    color: "#fbbf24",
  },
  {
    id: "croissant-brioche",
    name: "Croissant-Brioche",
    neighborhood: "Rice Village",
    lat: 29.7174,
    lng: -95.4148,
    demographic: "19-24 Rice Students & Academics",
    tags: ["Undergrads", "Grad students", "Study groups"],
    crowd: "Undergrads, grad students, study groups.",
    color: "#34d399",
  },
];
