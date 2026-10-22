"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMap } from "@vis.gl/react-google-maps";

// Renders arbitrary React content anchored to a lat/lng. Used instead of
// AdvancedMarker because that requires a mapId, and a mapId disables the
// custom `styles` we need to hide Google's own POI icons.
export default function HtmlMarker({
  position,
  zIndex = 0,
  children,
}: {
  position: google.maps.LatLngLiteral;
  zIndex?: number;
  children: ReactNode;
}) {
  const map = useMap();
  const [container] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  useEffect(() => {
    if (!map || !container) return;

    container.style.position = "absolute";
    container.style.transform = "translate(-50%, -50%)";

    class Overlay extends google.maps.OverlayView {
      onAdd() {
        this.getPanes()?.overlayMouseTarget.appendChild(container!);
        google.maps.OverlayView.preventMapHitsAndGesturesFrom(container!);
      }
      draw() {
        const point = this.getProjection()?.fromLatLngToDivPixel(position);
        if (!point) return;
        container!.style.left = `${point.x}px`;
        container!.style.top = `${point.y}px`;
      }
      onRemove() {
        container!.remove();
      }
    }

    const overlay = new Overlay();
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, container, position.lat, position.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (container) container.style.zIndex = String(zIndex);
  }, [container, zIndex]);

  return container ? createPortal(children, container) : null;
}
