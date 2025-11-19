import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CountryData } from "@/types/country-data";

interface WorldMapProps {
  data: CountryData[];
  selectedMetric: string;
  onCountryClick?: (country: CountryData) => void;
  activeCountry?: CountryData | null;
}

export const WorldMap = ({ data, selectedMetric, onCountryClick, activeCountry }: WorldMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  const getColorForLevel = (level: number | undefined): string => {
    if (level === undefined || Number.isNaN(level)) return "hsl(var(--muted))";

    if (level >= 80) return "hsl(var(--region-excellent))";
    if (level >= 60) return "hsl(var(--region-good))";
    if (level >= 40) return "hsl(var(--region-moderate))";
    if (level >= 20) return "hsl(var(--region-poor))";
    return "hsl(var(--region-warning))";
  };

  const metricLabels: Partial<Record<keyof CountryData, string>> = {
    renewableEnergyPercent: "Renewable Energy %",
    electricityCost: "Electricity Cost ($/kWh)",
    internetSpeed: "Internet Metric",
    gdpPerCapita: "GDP per Capita",
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

    // Pre-compute metric range for normalization
    const numericValues: number[] = [];
    data.forEach((country) => {
      const rawValue = country[selectedMetric as keyof CountryData] as number | undefined;
      if (typeof rawValue === "number" && !Number.isNaN(rawValue)) {
        numericValues.push(rawValue);
      }
    });

    const min = numericValues.length ? Math.min(...numericValues) : 0;
    const max = numericValues.length ? Math.max(...numericValues) : 0;
    const range = max - min || 1;

    const metricKey = selectedMetric as keyof CountryData;
    const metricLabel = metricLabels[metricKey] ?? String(selectedMetric);

    // Add new markers
    data.forEach((country) => {
      if (
        typeof country.latitude !== "number" ||
        Number.isNaN(country.latitude) ||
        typeof country.longitude !== "number" ||
        Number.isNaN(country.longitude)
      ) {
        return;
      }

      const rawValue = country[metricKey] as number | undefined;
      let level: number | undefined;
      if (typeof rawValue === "number" && !Number.isNaN(rawValue)) {
        level = ((rawValue - min) / range) * 100;
      }

      const isActive =
        activeCountry && activeCountry.countryCode === country.countryCode;

      const marker = L.circleMarker([country.latitude, country.longitude], {
        radius: isActive ? 10 : 8,
        fillColor: getColorForLevel(level),
        color: isActive ? "hsl(var(--chart-3))" : "#fff",
        weight: isActive ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold text-lg mb-2">${country.country}</h3>
          <div class="space-y-1 text-sm">
            ${
              rawValue !== undefined
                ? `<p><strong>${metricLabel}:</strong> ${rawValue.toLocaleString()}</p>`
                : ""
            }
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

    if (
      activeCountry &&
      typeof activeCountry.latitude === "number" &&
      typeof activeCountry.longitude === "number"
    ) {
      mapInstanceRef.current.setView(
        [activeCountry.latitude, activeCountry.longitude],
        4,
      );
    }
  }, [data, selectedMetric, onCountryClick, activeCountry]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Legend */}
      <div className="absolute bottom-6 right-6 glass-panel p-4 space-y-2">
        <p className="text-xs font-semibold mb-2">Metric Level (relative)</p>
        <div className="space-y-1">
          {[
            { label: "Very High", color: "var(--region-excellent)" },
            { label: "High", color: "var(--region-good)" },
            { label: "Medium", color: "var(--region-moderate)" },
            { label: "Low", color: "var(--region-poor)" },
            { label: "Very Low", color: "var(--region-warning)" },
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
