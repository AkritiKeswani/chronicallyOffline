"use client";

import { useEffect, useMemo, useState } from "react";
import { APIProvider, Circle, Map, useMap } from "@vis.gl/react-google-maps";
import { emojisForCafe, useCollections } from "@/lib/collections";
import { METERS_PER_MILE } from "@/lib/geo";
import { useAllSpots, useCommunity } from "@/lib/community";
import type { VibeNode } from "@/lib/nodes";
import { useTheme } from "@/lib/theme";
import CafeMarker from "./CafeMarker";
import HtmlMarker from "./HtmlMarker";
import UnvettedMarker from "./UnvettedMarker";
import type { NearbyResult } from "./NearbySearch";

// Google's POI/business/transit icons removed so our spots are the only
// things that pop. Shared rules + per-theme palette.
const HIDE_NOISE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b0e16" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b0e16" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#161b26" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#1f2633" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#060a12" }],
  },
  { featureType: "landscape.man_made", stylers: [{ color: "#0d111b" }] },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  ...HIDE_NOISE,
];

const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#eef1f6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a94a6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#eef1f6" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dfe4ec" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c8d6e5" }],
  },
  { featureType: "landscape.man_made", stylers: [{ color: "#e6eaf0" }] },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  ...HIDE_NOISE,
];

// Inner Loop, where most spots are. Outliers (e.g. Sugar Land) are a pan away.
const DEFAULT_CENTER = { lat: 29.742, lng: -95.39 };
const DEFAULT_ZOOM = 13;
const LABEL_ZOOM = 15; // full labels at/after this zoom
const CLUSTER_MAX_ZOOM = 13; // merge overlapping spots below/at this zoom
const CLUSTER_PX = 56;

type Cluster = { key: string; lat: number; lng: number; nodes: VibeNode[] };

function toWorldPx(lat: number, lng: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function cluster(nodes: VibeNode[], zoom: number): Cluster[] {
  const groups: { x: number; y: number; nodes: VibeNode[] }[] = [];
  for (const node of nodes) {
    const p = toWorldPx(node.lat, node.lng, zoom);
    const hit = groups.find(
      (g) => Math.hypot(g.x - p.x, g.y - p.y) < CLUSTER_PX,
    );
    if (hit) hit.nodes.push(node);
    else groups.push({ ...p, nodes: [node] });
  }
  return groups.map((g) => ({
    key: g.nodes.map((n) => n.id).join("+"),
    lat: g.nodes.reduce((s, n) => s + n.lat, 0) / g.nodes.length,
    lng: g.nodes.reduce((s, n) => s + n.lng, 0) / g.nodes.length,
    nodes: g.nodes,
  }));
}

export default function VibeMap(props: {
  apiKey: string;
  selected: VibeNode | null;
  visibleIds: string[] | null;
  nearby: NearbyResult | null;
  onSelect: (node: VibeNode) => void;
}) {
  const { theme } = useTheme();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showGoogle, setShowGoogle] = useState(true);

  return (
    <div className="relative h-full w-full">
      <APIProvider apiKey={props.apiKey}>
        <Map
          styles={theme === "dark" ? DARK_STYLE : LIGHT_STYLE}
          backgroundColor={theme === "dark" ? "#0b0e16" : "#eef1f6"}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          onZoomChanged={(e) => setZoom(Math.round(e.detail.zoom))}
          gestureHandling="greedy"
          clickableIcons={false}
          disableDefaultUI
          zoomControl
          className="h-full w-full"
        >
          <Markers {...props} zoom={zoom} />
          <GoogleLayer
            enabled={showGoogle}
            zoom={zoom}
            selected={props.selected}
            nearby={props.nearby}
            onSelect={props.onSelect}
          />
          {props.nearby && <NearbyOverlay nearby={props.nearby} />}
        </Map>
      </APIProvider>

      <div className="absolute bottom-6 right-16 z-10 w-56 rounded-xl border border-line bg-surface p-2.5 text-[11px] shadow-sm backdrop-blur">
        <p className="flex items-center gap-2 text-fg">
          <span
            className="h-3 w-3 shrink-0 rounded-full border-2 border-white"
            style={{
              background: "conic-gradient(#a78bfa, #22d3ee, #f472b6, #fbbf24, #a78bfa)",
              boxShadow: "0 0 8px #a78bfa",
            }}
          />
          <span>
            <b className="font-semibold">Vetted pick</b>
            <span className="text-muted"> · hand-checked, with a crowd profile</span>
          </span>
        </p>
        <button
          onClick={() => setShowGoogle((v) => !v)}
          title={showGoogle ? "Hide Google spots" : "Show Google spots"}
          className="mt-1.5 flex w-full items-center gap-2 text-left text-fg"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white ${showGoogle ? "bg-slate-400" : "bg-transparent"}`}
            style={{ boxShadow: "0 0 0 1px var(--line-strong)" }}
          />
          <span className="flex-1">
            <b className="font-semibold">From Google</b>
            <span className="text-muted"> · not vetted yet</span>
            {showGoogle && zoom < GOOGLE_MIN_ZOOM && <span className="text-subtle"> · zoom in</span>}
          </span>
          <span
            className={`relative h-3.5 w-6 shrink-0 rounded-full transition ${showGoogle ? "bg-invert" : "bg-fg/20"}`}
          >
            <span
              className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-solid transition-all ${showGoogle ? "left-3" : "left-0.5"}`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}

const GOOGLE_MIN_ZOOM = 13;

/**
 * Unvetted cafes/libraries from Google Places around wherever the map is
 * looking (zoomed in), plus any from a near-me search or a selected one.
 */
function GoogleLayer({
  enabled,
  zoom,
  selected,
  nearby,
  onSelect,
}: {
  enabled: boolean;
  zoom: number;
  selected: VibeNode | null;
  nearby: NearbyResult | null;
  onSelect: (node: VibeNode) => void;
}) {
  const map = useMap();
  const [browsed, setBrowsed] = useState<Record<string, VibeNode>>({});

  useEffect(() => {
    if (!map || !enabled) return;
    const fetched = new Set<string>();

    const listener = map.addListener("idle", async () => {
      const center = map.getCenter();
      if (!center || (map.getZoom() ?? 0) < GOOGLE_MIN_ZOOM) return;
      // ~1km grid so small pans don't refetch.
      const key = `${center.lat().toFixed(2)},${center.lng().toFixed(2)}`;
      if (fetched.has(key)) return;
      fetched.add(key);
      try {
        const res = await fetch(
          `/api/places?lat=${center.lat()}&lng=${center.lng()}&radiusMi=1.5`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBrowsed((prev) => {
          const next = { ...prev };
          for (const s of data.spots as VibeNode[]) next[s.id] = s;
          return next;
        });
      } catch (err) {
        fetched.delete(key);
        console.error("Google spots", err);
      }
    });
    return () => listener.remove();
  }, [map, enabled]);

  const spots = new globalThis.Map<string, VibeNode>();
  if (enabled && zoom >= GOOGLE_MIN_ZOOM)
    Object.values(browsed).forEach((s) => spots.set(s.id, s));
  if (enabled) nearby?.others.forEach(({ node }) => spots.set(node.id, node));
  if (selected && !selected.vetted) spots.set(selected.id, selected);

  return [...spots.values()].map((node) => {
    const active = node.id === selected?.id;
    return (
      <HtmlMarker
        key={node.id}
        position={{ lat: node.lat, lng: node.lng }}
        zIndex={active ? 9 : 0}
      >
        <UnvettedMarker
          node={node}
          active={active}
          onClick={() => onSelect(node)}
        />
      </HtmlMarker>
    );
  });
}

function Markers({
  selected,
  visibleIds,
  onSelect,
  zoom,
}: {
  selected: VibeNode | null;
  visibleIds: string[] | null;
  onSelect: (node: VibeNode) => void;
  zoom: number;
}) {
  const map = useMap();
  const { collections } = useCollections();
  const { here, eventsToday } = useCommunity();
  const spots = useAllSpots();
  const selectedId = selected?.id ?? null;

  const clusters = useMemo(
    () =>
      zoom <= CLUSTER_MAX_ZOOM
        ? cluster(spots, zoom)
        : spots.map((n) => ({ key: n.id, lat: n.lat, lng: n.lng, nodes: [n] })),
    [zoom, spots],
  );

  // Fly to whatever gets selected (marker click, saved list, etc).
  useEffect(() => {
    if (!map || !selected) return;
    map.panTo({ lat: selected.lat, lng: selected.lng });
    if ((map.getZoom() ?? 0) < LABEL_ZOOM) map.setZoom(LABEL_ZOOM);
  }, [map, selected]);

  function zoomInto(c: Cluster) {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    c.nodes.forEach((n) => bounds.extend({ lat: n.lat, lng: n.lng }));
    map.fitBounds(bounds, 120);
  }

  return clusters.map((c) => {
    if (c.nodes.length > 1) {
      return (
        <HtmlMarker
          key={c.key}
          position={{ lat: c.lat, lng: c.lng }}
          zIndex={2}
        >
          <button
            onClick={() => zoomInto(c)}
            className="group relative flex h-12 w-12 items-center justify-center"
            aria-label={`${c.nodes.length} spots — zoom in`}
          >
            <span
              className="absolute -inset-2 rounded-full opacity-70 blur-lg"
              style={{
                background: `conic-gradient(${c.nodes.map((n) => n.color).join(",")},${c.nodes[0].color})`,
              }}
            />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-solid text-sm font-bold text-fg shadow-lg transition group-hover:scale-110">
              {c.nodes.length}
            </span>
          </button>
        </HtmlMarker>
      );
    }
    const node = c.nodes[0];
    const active = node.id === selectedId;
    return (
      <HtmlMarker
        key={c.key}
        position={{ lat: node.lat, lng: node.lng }}
        zIndex={active ? 10 : 1}
      >
        <CafeMarker
          node={node}
          active={active}
          compact={zoom < LABEL_ZOOM}
          dimmed={visibleIds !== null && !visibleIds.includes(node.id)}
          savedEmojis={emojisForCafe(collections, node.id)}
          hereCount={here[node.id] ?? 0}
          eventToday={(eventsToday[node.id]?.length ?? 0) > 0}
          onClick={() => onSelect(node)}
        />
      </HtmlMarker>
    );
  });
}

function NearbyOverlay({ nearby }: { nearby: NearbyResult }) {
  const map = useMap();
  const { origin, radiusMi } = nearby;

  // Frame the search radius whenever a new search comes in.
  useEffect(() => {
    if (!map) return;
    const dLat = radiusMi / 69;
    const dLng = radiusMi / (69 * Math.cos((origin.lat * Math.PI) / 180));
    map.fitBounds(
      {
        north: origin.lat + dLat,
        south: origin.lat - dLat,
        east: origin.lng + dLng,
        west: origin.lng - dLng,
      },
      60,
    );
  }, [map, origin.lat, origin.lng, radiusMi]);

  return (
    <>
      <Circle
        center={{ lat: origin.lat, lng: origin.lng }}
        radius={radiusMi * METERS_PER_MILE}
        strokeColor="#3b82f6"
        strokeOpacity={0.6}
        strokeWeight={1.5}
        fillColor="#3b82f6"
        fillOpacity={0.06}
        clickable={false}
      />
      <HtmlMarker position={{ lat: origin.lat, lng: origin.lng }} zIndex={5}>
        <div className="flex flex-col items-center">
          <span className="relative flex h-5 w-5 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/50" />
            <span className="relative h-4 w-4 rounded-full border-[3px] border-white bg-blue-500 shadow-md" />
          </span>
          <span className="pointer-events-none absolute top-full mt-1 whitespace-nowrap rounded-md bg-solid/90 px-2 py-0.5 text-[11px] font-medium text-fg shadow">
            {origin.name}
          </span>
        </div>
      </HtmlMarker>
    </>
  );
}
