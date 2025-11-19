import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CountryData } from "@/types/country-data";
import { getCountryCoordinates } from "@/lib/country-coordinates";

interface WorldMapProps {
  data: CountryData[];
  selectedMetric: string;
  onCountryClick?: (country: CountryData) => void;
}

export const WorldMap = ({ data, selectedMetric, onCountryClick }: WorldMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  const getColorForScore = (score: number | undefined): string => {
    if (!score) return "hsl(var(--muted))";
    
    if (score >= 80) return "hsl(var(--region-excellent))";
    if (score >= 60) return "hsl(var(--region-good))";
    if (score >= 40) return "hsl(var(--region-moderate))";
    if (score >= 20) return "hsl(var(--region-poor))";
    return "hsl(var(--region-warning))";
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([20, 0], 2);

    // Add tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    data.forEach((country) => {
      const coords = getCountryCoordinates(country.country);
      if (!coords) return;

      const metricValue = country[selectedMetric as keyof CountryData] as number | undefined;
      const score = country.aiDatacenterScore || 50;
      
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        fillColor: getColorForScore(score),
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold text-lg mb-2">${country.country}</h3>
          <div class="space-y-1 text-sm">
            <p><strong>Score:</strong> ${score.toFixed(1)}/100</p>
            ${country.renewableEnergyPercent !== undefined ? 
              `<p><strong>Renewable Energy:</strong> ${country.renewableEnergyPercent.toFixed(1)}%</p>` : ''}
            ${country.electricityCost !== undefined ? 
              `<p><strong>Electricity Cost:</strong> $${country.electricityCost.toFixed(2)}/kWh</p>` : ''}
            ${country.internetSpeed !== undefined ? 
              `<p><strong>Internet Speed:</strong> ${country.internetSpeed.toFixed(0)} Mbps</p>` : ''}
          </div>
        </div>
      `);

      marker.on("click", () => {
        if (onCountryClick) onCountryClick(country);
      });

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
  }, [data, selectedMetric, onCountryClick]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Legend */}
      <div className="absolute bottom-6 right-6 glass-panel p-4 space-y-2">
        <p className="text-xs font-semibold mb-2">Score Rating</p>
        <div className="space-y-1">
          {[
            { label: "Excellent (80-100)", color: "var(--region-excellent)" },
            { label: "Good (60-79)", color: "var(--region-good)" },
            { label: "Moderate (40-59)", color: "var(--region-moderate)" },
            { label: "Poor (20-39)", color: "var(--region-poor)" },
            { label: "Warning (<20)", color: "var(--region-warning)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <div
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: `hsl(${item.color})` }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
