"use client";

import { memo, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowSquareOutIcon,
  CrosshairIcon,
  CloudRainIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react";
import type { Place } from "@/lib/weather";

maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
maplibregl.setWorkerCount(1);

function WeatherMap({
  place,
  dark,
  expanded = false,
}: {
  place: Place;
  dark: boolean;
  expanded?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [error, setError] = useState(false);
  const [radar, setRadar] = useState(false);
  const [radarTime, setRadarTime] = useState<number | null>(null);
  const [radarError, setRadarError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    setError(false);
    try {
      const instance = new maplibregl.Map({
        container: container.current,
        center: [place.longitude, place.latitude],
        zoom: expanded ? 8 : 10,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        style: {
          version: 8,
          sources: {
            basemap: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            },
          },
          layers: [
            {
              id: "basemap",
              type: "raster",
              source: "basemap",
              paint: {
                "raster-saturation": -0.85,
                "raster-brightness-min": dark ? 0.82 : 0,
                "raster-brightness-max": dark ? 0.08 : 1,
              },
            },
          ],
        },
      });
      map.current = instance;
      const dot = document.createElement("div");
      dot.className = "map-location-dot";
      new maplibregl.Marker({ element: dot })
        .setLngLat([place.longitude, place.latitude])
        .addTo(instance);
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      instance.on("error", (e) => {
        if (!instance.isStyleLoaded() || e.error?.message?.includes("WebGL")) setError(true);
      });
      return () => {
        instance.remove();
        map.current = null;
      };
    } catch {
      setError(true);
    }
  }, [place.latitude, place.longitude, dark, expanded]);

  useEffect(() => {
    if (!radar || !map.current) return;
    const controller = new AbortController();
    const instance = map.current;
    async function load() {
      try {
        const response = await fetch("/api/radar", { signal: controller.signal });
        if (!response.ok) throw new Error();
        const frame = await response.json();
        if (controller.signal.aborted) return;
        const add = () => {
          if (controller.signal.aborted || instance.getSource("radar")) return;
          instance.addSource("radar", {
            type: "raster",
            tiles: [`${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`],
            tileSize: 256,
            maxzoom: 7,
            attribution: 'Radar © <a href="https://www.rainviewer.com">RainViewer</a>',
          });
          instance.addLayer({
            id: "radar",
            type: "raster",
            source: "radar",
            paint: { "raster-opacity": 0.65 },
          });
          setRadarTime(frame.time);
          setRadarError(false);
        };
        if (instance.isStyleLoaded()) add();
        else instance.once("load", add);
      } catch {
        if (!controller.signal.aborted) setRadarError(true);
      }
    }
    void load();
    return () => {
      controller.abort();
      if (instance.getLayer("radar")) instance.removeLayer("radar");
      if (instance.getSource("radar")) instance.removeSource("radar");
    };
  }, [radar, dark, place.latitude, place.longitude, expanded]);

  return (
    <div className={`map-shell ${expanded ? "map-expanded" : ""}`}>
      <div ref={container} className="real-map" aria-label={`Interactive map of ${place.name}`} />
      {error && (
        <div className="map-fallback">
          <MapTrifoldIcon size={32} />
          <p>The map couldn’t load on this device.</p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=11/${place.latitude}/${place.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Open {place.name} in OpenStreetMap <ArrowSquareOutIcon />
          </a>
        </div>
      )}
      <div className="map-top">
        <span className="map-label">
          <span className="live-dot" /> {place.name}
        </span>
        <button
          className={`map-radar ${radar ? "selected" : ""}`}
          onClick={() => setRadar(!radar)}
          aria-pressed={radar}
        >
          <CloudRainIcon size={16} /> Rain radar
        </button>
      </div>
      <button
        className="map-recenter icon-button"
        aria-label="Center map on selected location"
        onClick={() =>
          map.current?.flyTo({ center: [place.longitude, place.latitude], zoom: expanded ? 8 : 10 })
        }
      >
        <CrosshairIcon size={19} />
      </button>
      {radar && (
        <div className="radar-caption">
          {radarError
            ? "Radar temporarily unavailable"
            : radarTime
              ? `Radar · ${new Date(radarTime * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
              : "Loading current radar…"}
        </div>
      )}
    </div>
  );
}

export default memo(WeatherMap);
