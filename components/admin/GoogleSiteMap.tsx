"use client";

import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

type MapsNamespace = {
  Map: new (
    el: HTMLElement,
    opts: Record<string, unknown>,
  ) => {
    setCenter: (c: LatLng) => void;
    setZoom: (z: number) => void;
    addListener: (
      event: string,
      cb: (e: { latLng: { lat: () => number; lng: () => number } }) => void,
    ) => void;
    getCenter?: () => { lat: () => number; lng: () => number };
  };
  Marker: new (opts: Record<string, unknown>) => {
    setMap: (map: unknown) => void;
    setPosition: (c: LatLng) => void;
    getPosition?: () => { lat: () => number; lng: () => number };
    addListener: (event: string, cb: (e: unknown) => void) => void;
  };
  Geocoder: new () => {
    geocode: (
      req: { location: LatLng },
      cb: (
        results: Array<{ formatted_address?: string }> | null,
        status: string,
      ) => void,
    ) => void;
  };
  places?: {
    Autocomplete: new (
      input: HTMLInputElement,
      opts?: Record<string, unknown>,
    ) => {
      addListener: (event: string, cb: () => void) => void;
      getPlace: () => {
        geometry?: { location?: { lat: () => number; lng: () => number } };
        formatted_address?: string;
        name?: string;
      };
    };
  };
};

declare global {
  interface Window {
    google?: { maps: MapsNamespace };
  }
}

let mapsLoader: Promise<MapsNamespace> | null = null;

function loadGoogleMaps(apiKey: string): Promise<MapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires the browser"));
  }
  const existingMaps = window.google?.maps;
  if (existingMaps) {
    return Promise.resolve(existingMaps);
  }
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<MapsNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-maps]",
    );
    const finish = () => {
      const maps = window.google?.maps;
      if (maps) resolve(maps);
      else reject(new Error("Google Maps failed to load"));
    };

    if (existing) {
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () => {
        reject(new Error("Google Maps failed to load"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = finish;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return mapsLoader;
}

interface GoogleSiteMapProps {
  apiKey: string;
  lat: number | null;
  lng: number | null;
  markerLabel?: string;
  onPick: (coords: LatLng, address?: string | null) => void;
  disabled?: boolean;
}

export function GoogleSiteMap({
  apiKey,
  lat,
  lng,
  markerLabel = "Site",
  onPick,
  disabled = false,
}: GoogleSiteMapProps) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const inputElRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<{
    setCenter: (c: LatLng) => void;
    setZoom: (z: number) => void;
    addListener: (
      event: string,
      cb: (e: { latLng: { lat: () => number; lng: () => number } }) => void,
    ) => void;
    getCenter?: () => { lat: () => number; lng: () => number };
  } | null>(null);
  const markerRef = useRef<{
    setMap: (map: unknown) => void;
    setPosition: (c: LatLng) => void;
    getPosition?: () => { lat: () => number; lng: () => number };
    addListener: (event: string, cb: (e: unknown) => void) => void;
  } | null>(null);
  const geocoderRef = useRef<{
    geocode: (
      req: { location: LatLng },
      cb: (
        results: Array<{ formatted_address?: string }> | null,
        status: string,
      ) => void,
    ) => void;
  } | null>(null);
  const onPickRef = useRef(onPick);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onPickRef.current = onPick;
    disabledRef.current = disabled;
  }, [onPick, disabled]);

  useEffect(() => {
    let cancelled = false;
    const el = mapElRef.current;
    if (!el || !apiKey) return;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapElRef.current) return;

        const center: LatLng =
          lat !== null && lng !== null
            ? { lat, lng }
            : { lat: -6.7924, lng: 39.2086 };

        const map = new maps.Map(mapElRef.current, {
          center,
          zoom: lat !== null ? 15 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        mapRef.current = map;

        const marker = new maps.Marker({
          map,
          position: center,
          draggable: true,
          title: markerLabel,
        });
        markerRef.current = marker;

        geocoderRef.current = new maps.Geocoder();

        const emit = (position: LatLng) => {
          if (disabledRef.current) return;
          const geocoder = geocoderRef.current;
          const coords = { lat: position.lat, lng: position.lng };
          if (!geocoder) {
            onPickRef.current(coords, null);
            return;
          }
          geocoder.geocode({ location: coords }, (results, status) => {
            const address =
              status === "OK" && results?.[0]?.formatted_address
                ? results[0].formatted_address
                : null;
            onPickRef.current(coords, address);
          });
        };

        map.addListener("click", (e: {
          latLng: { lat: () => number; lng: () => number };
        }) => {
          const position = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(position);
          emit(position);
        });

        marker.addListener("dragend", () => {
          const raw = marker.getPosition?.();
          const centerPos = map.getCenter?.();
          const position =
            raw && typeof raw.lat === "function"
              ? { lat: raw.lat(), lng: raw.lng() }
              : centerPos
                ? { lat: centerPos.lat(), lng: centerPos.lng() }
                : null;
          if (!position) return;
          emit(position);
        });

        const input = inputElRef.current;
        const places = maps.places;
        if (input && places?.Autocomplete) {
          const autocomplete = new places.Autocomplete(input, {
            fields: ["formatted_address", "geometry", "name"],
            types: ["geocode"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const loc = place.geometry?.location;
            if (!loc) return;
            const position = { lat: loc.lat(), lng: loc.lng() };
            marker.setPosition(position);
            map.setCenter(position);
            map.setZoom(15);
            onPickRef.current(
              position,
              place.formatted_address ?? place.name ?? null,
            );
          });
        }

        if (lat !== null && lng !== null) {
          const position = { lat, lng };
          marker.setPosition(position);
          map.setCenter(position);
          map.setZoom(15);
        }
      })
      .catch(() => {
        // Parent shows missing-key / load failure UI
      });

    return () => {
      cancelled = true;
    };
    // Re-init only when key changes; position updates via refs below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (lat === null || lng === null) return;
    mapRef.current?.setCenter({ lat, lng });
    mapRef.current?.setZoom(15);
    markerRef.current?.setPosition({ lat, lng });
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <input
        ref={inputElRef}
        type="text"
        placeholder="Search a place (Google Places)…"
        disabled={disabled || !apiKey}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        autoComplete="off"
      />
      <div
        ref={mapElRef}
        className="h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
        aria-label="Site map"
      />
      <p className="text-xs text-slate-500">
        Search a place or click/drag the marker to set the site coordinates.
      </p>
    </div>
  );
}
