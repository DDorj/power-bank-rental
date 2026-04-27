"use client";

import { useEffect, useState } from "react";
import { DEFAULT_GEOPOINT, type GeoPoint } from "@/shared/lib/location";

type LocationState = "loading" | "ready" | "fallback";

export function useUserLocation() {
  const [coords, setCoords] = useState<GeoPoint>(DEFAULT_GEOPOINT);
  const [state, setState] = useState<LocationState>(() => {
    if (typeof window === "undefined") {
      return "loading";
    }

    return "geolocation" in navigator ? "loading" : "fallback";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setState("ready");
      },
      () => {
        setState("fallback");
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300_000,
      },
    );
  }, []);

  return {
    coords,
    state,
    hasExactLocation: state === "ready",
  };
}
