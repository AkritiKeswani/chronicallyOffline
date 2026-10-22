"use client";

import { APIProvider, AdvancedMarker, ColorScheme, Map } from "@vis.gl/react-google-maps";
import { NODES, type VibeNode } from "@/lib/nodes";

export default function VibeMap({
  apiKey,
  selectedId,
  onSelect,
}: {
  apiKey: string;
  selectedId: string | null;
  onSelect: (node: VibeNode) => void;
}) {
  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId="DEMO_MAP_ID"
        colorScheme={ColorScheme.DARK}
        defaultCenter={{ lat: 29.742, lng: -95.385 }}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        className="h-full w-full"
      >
        {NODES.map((node) => {
          const active = node.id === selectedId;
          return (
            <AdvancedMarker
              key={node.id}
              position={{ lat: node.lat, lng: node.lng }}
              onClick={() => onSelect(node)}
              title={node.name}
            >
              <div className="flex flex-col items-center gap-1">
                <span
                  className="rounded-md border bg-black/80 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                  style={{ borderColor: `${node.color}88`, color: node.color }}
                >
                  {node.demographic}
                </span>
                <span
                  className="vibe-pulse block h-4 w-4 rounded-full border-2 border-white/80"
                  style={{
                    background: node.color,
                    boxShadow: `0 0 ${active ? 28 : 16}px ${node.color}`,
                    color: node.color,
                  }}
                />
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>
    </APIProvider>
  );
}
