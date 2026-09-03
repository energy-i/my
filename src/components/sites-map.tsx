import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Site } from "@/lib/types";

type SitesMapProps = {
  sites: Site[];
};

let configuredApiKey: string | null = null;

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }],
  },
  { featureType: "landscape", stylers: [{ color: "#f1f5f9" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e2e8f0" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", stylers: [{ color: "#dbeafe" }] },
];

function hasCoordinates(
  site: Site,
): site is Site & { latitude: number; longitude: number } {
  return site.latitude !== null && site.longitude !== null;
}

export function SitesMap({ sites }: SitesMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mappableSites = sites.filter(hasCoordinates);

  useEffect(() => {
    if (!apiKey || !mapElement.current || mappableSites.length === 0) return;

    let cancelled = false;
    let markers: google.maps.Marker[] = [];
    if (!configuredApiKey) {
      setOptions({ key: apiKey, v: "weekly" });
      configuredApiKey = apiKey;
    }

    void importLibrary("maps")
      .then(() => {
        if (cancelled || !mapElement.current) return;

        const map = new google.maps.Map(mapElement.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: MAP_STYLES,
        });
        const bounds = new google.maps.LatLngBounds();
        const infoWindow = new google.maps.InfoWindow();

        markers = mappableSites.map((site) => {
          const position = {
            lat: site.latitude,
            lng: site.longitude,
          };
          bounds.extend(position);
          const marker = new google.maps.Marker({
            map,
            position,
            title: site.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              scale: 8,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          marker.addListener("click", () => {
            const content = document.createElement("div");
            const link = document.createElement("a");
            link.href = `/sites/${site.id}`;
            link.textContent = site.name;
            link.className = "font-medium text-sm underline";
            content.append(link);

            if (site.addressLine1 || site.city) {
              const address = document.createElement("p");
              address.textContent = [site.addressLine1, site.city]
                .filter(Boolean)
                .join(", ");
              address.className = "mt-1 text-xs";
              content.append(address);
            }

            infoWindow.setContent(content);
            infoWindow.open({ map, anchor: marker });
          });

          return marker;
        });

        if (mappableSites.length === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(14);
        } else {
          map.fitBounds(bounds, 48);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Google Maps could not be loaded.");
      });

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [apiKey, mappableSites]);

  if (!apiKey) {
    return (
      <Alert>
        <AlertTitle>Google Maps key required</AlertTitle>
        <AlertDescription>
          Add VITE_GOOGLE_MAPS_API_KEY to display site locations.
        </AlertDescription>
      </Alert>
    );
  }

  if (mappableSites.length === 0) {
    return (
      <Alert>
        <AlertTitle>No mapped sites</AlertTitle>
        <AlertDescription>
          Add latitude and longitude to a site to show it on the map.
        </AlertDescription>
      </Alert>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Map unavailable</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      ref={mapElement}
      className="h-[calc(100vh-10rem)] min-h-105 w-full border"
    />
  );
}
