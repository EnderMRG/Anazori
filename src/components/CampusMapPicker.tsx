"use client";

import { useEffect, useRef, useState } from "react";
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
  const markerRef = useRef<any>(null);

  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );

  // Sync external coords
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedCoords({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  // Initialize Leaflet Map
  useEffect(() => {
    let active = true;

    async function init() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!active || !mapContainerRef.current) return;

      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
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
            <svg width="22" height="30" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 19.5 12 32 12 32C12 32 24 19.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#2b8f85"/>
              <circle cx="12" cy="12" r="5" fill="#ffffff"/>
            </svg>
          </div>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });

      // If initial coordinates exist, place the pin
      if (selectedCoords) {
        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const lat = parseFloat(pos.lat.toFixed(6));
          const lng = parseFloat(pos.lng.toFixed(6));
          setSelectedCoords({ lat, lng });
          onChange({ latitude: lat, longitude: lng });
        });
      }

      // Map Click to drop / move pin
      map.on("click", (e: any) => {
        const lat = parseFloat(e.latlng.lat.toFixed(6));
        const lng = parseFloat(e.latlng.lng.toFixed(6));
        setSelectedCoords({ lat, lng });
        onChange({ latitude: lat, longitude: lng });

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], {
            icon: customPinIcon,
            draggable: true,
          }).addTo(map);
          markerRef.current = marker;

          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            const nlat = parseFloat(pos.lat.toFixed(6));
            const nlng = parseFloat(pos.lng.toFixed(6));
            setSelectedCoords({ lat: nlat, lng: nlng });
            onChange({ latitude: nlat, longitude: nlng });
          });
        }
      });
    }

    void init();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [campus.name]);

  // Move marker and pan when selectedCoords changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedCoords) return;
    const map = mapInstanceRef.current;
    if (markerRef.current) {
      markerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
    }
  }, [selectedCoords]);

  // Live Location Trigger
  function handleUseLiveLocation() {
    if (!navigator.geolocation) {
      setGpsError(isAssamese ? "আপোনাৰ ব্ৰাউজাৰত GPS উপলব্ধ নহয়।" : "Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));

        setSelectedCoords({ lat, lng });
        onChange({
          latitude: lat,
          longitude: lng,
          locationLabel: `GPS (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
        }
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
              ? "GPS সংকেত পোৱা নগ'ল। মেপত পিন নিৰ্বাচন কৰক।"
              : "Unable to retrieve GPS position. Please tap on the map to set location."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  // Clear pin
  function handleClearPin() {
    setSelectedCoords(null);
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
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

      {/* Map Footer Bar with Selected Coords or Tap Hint */}
      <div className="map-picker-bottom">
        {selectedCoords ? (
          <div className="map-coords-badge">
            <MapPin size={12} />
            <span>
              {selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lng.toFixed(4)}° E
            </span>
            <button
              type="button"
              className="clear-pin-btn"
              onClick={handleClearPin}
              title={isAssamese ? "পিন আঁতৰাওক" : "Clear dropped pin"}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="map-hint-text">
            {isAssamese
              ? "মেপত টেপ কৰি সমস্যাৰ সঠিক স্থানত পিন বহুৱাওক"
              : "Tap anywhere on the map to drop the pin"}
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
        mapInstanceRef.current.remove();
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
            <svg width="22" height="30" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, title, locationName]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

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

