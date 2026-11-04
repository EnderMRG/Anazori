"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  X,
} from "lucide-react";
import type { Campus } from "@/lib/campuses";
import type { Language } from "@/components/CivicSenseApp";

export type MapPickerProps = {
  campus: Campus;
  latitude?: number | null;
  longitude?: number | null;
  onChange: (coords: { latitude: number; longitude: number; locationLabel?: string }) => void;
  onClear?: () => void;
  language?: Language;
  label?: string;
  height?: number | string;
};

export default function CampusMapPicker({
  campus,
  latitude,
  longitude,
  onChange,
  onClear,
  language = "en",
  label = "Pinpoint exact issue location on campus",
  height = 260,
}: MapPickerProps) {
  const isAssamese = language === "as";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const customPinIconRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);

  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );

  // Helper to place, update or move the draggable pin
  const placeOrMoveMarker = useCallback(
    (
      lat: number,
      lng: number,
      options?: {
        flyTo?: boolean;
        zoom?: number;
        isLiveGps?: boolean;
        accuracy?: number;
        tooltipText?: string;
      }
    ) => {
      const map = mapInstanceRef.current;
      const L = leafletRef.current;
      const pinIcon = customPinIconRef.current;
      if (!map || !L || !pinIcon) return;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: pinIcon,
          draggable: true,
          autoPan: true,
        }).addTo(map);

        marker.on("dragstart", () => {
          if (accuracyCircleRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(accuracyCircleRef.current);
            accuracyCircleRef.current = null;
          }
          marker.closeTooltip();
        });

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const nlat = parseFloat(pos.lat.toFixed(6));
          const nlng = parseFloat(pos.lng.toFixed(6));
          setSelectedCoords({ lat: nlat, lng: nlng });
          onChange({
            latitude: nlat,
            longitude: nlng,
            locationLabel: `Pinned (${nlat.toFixed(4)}° N, ${nlng.toFixed(4)}° E)`,
          });
          marker
            .bindTooltip(
              isAssamese
                ? "📍 অৱস্থান আপডেট কৰা হ'ল (স্থান সলাবলৈ আকৌ টানিব পাৰে)"
                : "📍 Location adjusted (Drag again or tap map)",
              { permanent: false, direction: "top", offset: [0, -32] }
            )
            .openTooltip();
        });

        markerRef.current = marker;
      }

      if (options?.isLiveGps) {
        markerRef.current
          .bindTooltip(
            isAssamese
              ? "📍 লাইভ GPS অৱস্থান (স্থান সলাবলৈ পিন টানক বা মেপত টেপ কৰক)"
              : "📍 Exact Live Location (Drag pin or tap map to adjust)",
            { permanent: false, direction: "top", offset: [0, -32] }
          )
          .openTooltip();

        if (options.accuracy) {
          if (accuracyCircleRef.current) {
            map.removeLayer(accuracyCircleRef.current);
          }
          accuracyCircleRef.current = L.circle([lat, lng], {
            radius: Math.min(Math.max(options.accuracy, 10), 120),
            color: "#2b8f85",
            fillColor: "#2b8f85",
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: "4, 6",
          }).addTo(map);
        }
      } else if (options?.tooltipText) {
        markerRef.current
          .bindTooltip(options.tooltipText, {
            permanent: false,
            direction: "top",
            offset: [0, -32],
          })
          .openTooltip();
      }

      if (options?.flyTo) {
        map.flyTo([lat, lng], options.zoom ?? 18, { duration: 1.2 });
      }
    },
    [isAssamese, onChange]
  );

  // Sync external coords
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedCoords((prev) => {
        if (prev?.lat === latitude && prev?.lng === longitude) return prev;
        return { lat: latitude, lng: longitude };
      });
      if (mapInstanceRef.current && leafletRef.current && customPinIconRef.current) {
        placeOrMoveMarker(latitude, longitude, { flyTo: false });
      }
    }
  }, [latitude, longitude, placeOrMoveMarker]);

  // Initialize Leaflet Map
  useEffect(() => {
    let active = true;

    async function init() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!active || !mapContainerRef.current) return;

      // Clean up previous instance if any
      if (accuracyCircleRef.current && mapInstanceRef.current) {
        try { mapInstanceRef.current.removeLayer(accuracyCircleRef.current); } catch {}
        accuracyCircleRef.current = null;
      }
      if (markerRef.current && mapInstanceRef.current) {
        try { mapInstanceRef.current.removeLayer(markerRef.current); } catch {}
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch {}
        mapInstanceRef.current = null;
      }

      const initialLat = selectedCoords?.lat ?? campus.lat ?? 27.4539;
      const initialLng = selectedCoords?.lng ?? campus.lng ?? 94.8973;
      const initialZoom = selectedCoords ? 17 : 15;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: true,
        attributionControl: false,
      });

      mapInstanceRef.current = map;
      leafletRef.current = L;

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Create Custom SVG Pin Marker Icon
      const customPinIcon = L.divIcon({
        className: "campus-map-pin",
        html: `
          <div class="pin-pulse"></div>
          <div class="pin-marker-head">
            <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 19.5 12 32 12 32C12 32 24 19.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#2b8f85"/>
              <circle cx="12" cy="12" r="5" fill="#ffffff"/>
            </svg>
          </div>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });

      customPinIconRef.current = customPinIcon;

      // If initial coordinates exist, place the pin
      if (selectedCoords) {
        placeOrMoveMarker(selectedCoords.lat, selectedCoords.lng, {
          flyTo: false,
          zoom: initialZoom,
        });
      }

      // Map Click to drop / move pin anywhere on campus
      map.on("click", (e: any) => {
        const lat = parseFloat(e.latlng.lat.toFixed(6));
        const lng = parseFloat(e.latlng.lng.toFixed(6));

        if (accuracyCircleRef.current) {
          try { map.removeLayer(accuracyCircleRef.current); } catch {}
          accuracyCircleRef.current = null;
        }

        setSelectedCoords({ lat, lng });
        onChange({
          latitude: lat,
          longitude: lng,
          locationLabel: `Pinned (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
        });

        placeOrMoveMarker(lat, lng, {
          tooltipText: isAssamese
            ? "📍 পিন বহুওৱা হ'ল (স্থান সলাবলৈ টানক বা মেপত টেপ কৰক)"
            : "📍 Pin placed (Drag to adjust or tap elsewhere)",
        });
      });
    }

    void init();

    return () => {
      active = false;
      if (accuracyCircleRef.current && mapInstanceRef.current) {
        try { mapInstanceRef.current.removeLayer(accuracyCircleRef.current); } catch {}
        accuracyCircleRef.current = null;
      }
      if (markerRef.current && mapInstanceRef.current) {
        try { mapInstanceRef.current.removeLayer(markerRef.current); } catch {}
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [campus.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live Location Trigger
  function handleUseLiveLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError(
        isAssamese
          ? "আপোনাৰ ব্ৰাউজাৰত GPS উপলব্ধ নহয়।"
          : "Geolocation is not supported by your browser."
      );
      return;
    }

    setLocating(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = position.coords.accuracy;

        setSelectedCoords({ lat, lng });
        onChange({
          latitude: lat,
          longitude: lng,
          locationLabel: `Live GPS (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
        });

        // Drop the pin immediately at the exact live location and fly to it
        placeOrMoveMarker(lat, lng, {
          flyTo: true,
          zoom: 18,
          isLiveGps: true,
          accuracy,
        });
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError(
            isAssamese
              ? "অৱস্থানৰ অনুমতি নাকচ কৰা হৈছে। মেপত টেপ কৰি পিন নিৰ্বাচন কৰক।"
              : "Location access was denied. You can tap anywhere on the map to drop the pin manually."
          );
        } else {
          setGpsError(
            isAssamese
              ? "GPS সংকেত পোৱা নগ'ল। অনুগ্ৰহ কৰি মেপত টেপ কৰি স্থান বাছনি কৰক।"
              : "Unable to retrieve GPS position. Please tap on the map to set location."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Clear pin
  function handleClearPin() {
    setSelectedCoords(null);
    if (markerRef.current && mapInstanceRef.current) {
      try { mapInstanceRef.current.removeLayer(markerRef.current); } catch {}
      markerRef.current = null;
    }
    if (accuracyCircleRef.current && mapInstanceRef.current) {
      try { mapInstanceRef.current.removeLayer(accuracyCircleRef.current); } catch {}
      accuracyCircleRef.current = null;
    }
    if (onClear) onClear();
  }

  return (
    <div className="campus-map-picker-card">
      <div className="map-picker-top">
        <div className="map-picker-title">
          <MapPin size={15} />
          <span>{label}</span>
        </div>

        <button
          type="button"
          className="map-live-loc-btn"
          disabled={locating}
          onClick={handleUseLiveLocation}
        >
          {locating ? (
            <>
              <Loader2 size={13} className="spin" />
              <span>{isAssamese ? "অৱস্থান লোৱা হৈছে..." : "Acquiring GPS..."}</span>
            </>
          ) : (
            <>
              <LocateFixed size={13} />
              <span>{isAssamese ? "মোৰ লাইভ অৱস্থান ব্যৱহাৰ কৰক" : "Use My Live Location"}</span>
            </>
          )}
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="map-viewport-box"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      />

      {/* Map Footer Bar with Selected Coords & Adjustment Hint */}
      <div className="map-picker-bottom">
        {selectedCoords ? (
          <div className="map-coords-row">
            <div className="map-coords-badge">
              <MapPin size={12} />
              <span>
                {selectedCoords.lat.toFixed(5)}° N, {selectedCoords.lng.toFixed(5)}° E
              </span>
              <button
                type="button"
                className="clear-pin-btn"
                onClick={handleClearPin}
                title={isAssamese ? "পিন আঁতৰাওক" : "Clear dropped pin"}
                aria-label="Clear pin"
              >
                <X size={12} />
              </button>
            </div>
            <span className="map-hint-sub">
              {isAssamese
                ? "💡 স্থান সলাবলৈ পিনটো টানি নিয়ক বা মেপত টেপ কৰক"
                : "💡 Drag pin or tap anywhere on map to adjust"}
            </span>
          </div>
        ) : (
          <span className="map-hint-text">
            {isAssamese
              ? "মেপত টেপ কৰি বা ওপৰত 'লাইভ অৱস্থান' ক্লিক কৰি পিন বহুৱাওক"
              : "Tap anywhere on the map or click 'Use My Live Location'"}
          </span>
        )}
      </div>

      {gpsError && <div className="map-gps-error">{gpsError}</div>}
    </div>
  );
}

// Read-Only Map View for Campus Administrators & Detailed Workflow
export function CampusMapView({
  latitude,
  longitude,
  title,
  locationName,
  height = 200,
  language = "en",
}: {
  latitude: number;
  longitude: number;
  title?: string;
  locationName?: string;
  height?: number | string;
  language?: Language;
}) {
  const isAssamese = language === "as";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!active || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch {}
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const customPinIcon = L.divIcon({
        className: "campus-map-pin",
        html: `
          <div class="pin-pulse"></div>
          <div class="pin-marker-head">
            <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 19.5 12 32 12 32C12 32 24 19.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#2b8f85"/>
              <circle cx="12" cy="12" r="5" fill="#ffffff"/>
            </svg>
          </div>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });

      const marker = L.marker([latitude, longitude], { icon: customPinIcon }).addTo(map);
      if (title || locationName) {
        marker.bindPopup(`<b>${title || "Issue Location"}</b><br/>${locationName || ""}`);
      }
    }

    void init();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, title, locationName]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="campus-map-view-card">
      <div className="map-view-header">
        <div className="map-view-title">
          <MapPin size={15} />
          <b>{isAssamese ? "নিৰ্ধাৰিত GPS অৱস্থান মেপ" : "Exact Geotagged Location"}</b>
          <span className="coords-pill">
            {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
          </span>
        </div>

        <div className="map-external-links">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="map-nav-btn"
            title="Open directions in Google Maps"
          >
            <Navigation size={12} />
            <span>Google Maps</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="map-viewport-box view-mode-viewport"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      />
    </div>
  );
}
