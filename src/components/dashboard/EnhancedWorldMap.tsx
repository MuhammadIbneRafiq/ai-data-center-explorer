import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CountryData } from "@/types/country-data";

interface EnhancedWorldMapProps {
  data: CountryData[];
  selectedMetric: string;
  onCountryClick?: (country: CountryData) => void;
  activeCountry?: CountryData | null;
  highlightedCountries?: Set<string>;
}

export const EnhancedWorldMap = ({ 
  data, 
  selectedMetric, 
  onCountryClick, 
  activeCountry,
  highlightedCountries 
}: EnhancedWorldMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Load GeoJSON data
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      .then(response => response.json())
      .then(data => {
        console.log("✅ Loaded GeoJSON data");
        setGeoJsonData(data);
      })
      .catch(error => {
        console.error("❌ Error loading GeoJSON:", error);
      });
  }, []);

  const getColorForLevel = (level: number | undefined): string => {
    if (level === undefined || Number.isNaN(level)) return "hsl(var(--muted))";

    if (level >= 80) return "hsl(var(--region-excellent))";
    if (level >= 60) return "hsl(var(--region-good))";
    if (level >= 40) return "hsl(var(--region-moderate))";
    if (level >= 20) return "hsl(var(--region-poor))";
    return "hsl(var(--region-warning))";
  };

  // Create country lookup map
  const countryLookup = useRef<Map<string, CountryData>>(new Map());
  useEffect(() => {
    countryLookup.current.clear();
    data.forEach(country => {
      // Add multiple possible name variations
      countryLookup.current.set(country.country.toUpperCase(), country);
      countryLookup.current.set(country.countryCode.toUpperCase(), country);
      
      // Handle special cases
      const normalized = country.country.toUpperCase()
        .replace(/,/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      countryLookup.current.set(normalized, country);
    });
  }, [data]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([20, 0], 2);

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

  // Update GeoJSON layer when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !geoJsonData) return;

    // Remove existing layer
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.remove();
    }

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

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: (feature) => {
        const countryName = feature?.properties?.ADMIN || feature?.properties?.name || "";
        const country = findCountry(countryName);
        
        let fillColor = "hsl(var(--muted) / 0.3)";
        let fillOpacity = 0.3;
        let weight = 1;
        let color = "hsl(var(--border))";

        if (country) {
          const rawValue = country[selectedMetric as keyof CountryData] as number | undefined;
          if (typeof rawValue === "number" && !isNaN(rawValue)) {
            const level = ((rawValue - min) / range) * 100;
            fillColor = getColorForLevel(level);
            fillOpacity = 0.7;
          }

          // Highlight logic
          if (highlightedCountries && highlightedCountries.size > 0) {
            if (highlightedCountries.has(country.countryCode)) {
              fillColor = "hsl(var(--chart-1))";
              fillOpacity = 0.8;
              weight = 2;
              color = "hsl(var(--chart-1))";
            } else {
              fillOpacity = 0.2;
            }
          }

          // Active country
          if (activeCountry && activeCountry.countryCode === country.countryCode) {
            weight = 3;
            color = "hsl(var(--chart-3))";
            fillOpacity = 0.9;
          }
        }

        return {
          fillColor,
          fillOpacity,
          color,
          weight,
        };
      },
      onEachFeature: (feature, layer) => {
        const countryName = feature?.properties?.ADMIN || feature?.properties?.name || "";
        const country = findCountry(countryName);

        if (country) {
          const rawValue = country[selectedMetric as keyof CountryData] as number | undefined;
          
          layer.bindPopup(`
            <div class="p-2">
              <h3 class="font-bold text-lg mb-2">${country.country}</h3>
              <div class="space-y-1 text-sm">
                ${rawValue !== undefined ? `<p><strong>${selectedMetric}:</strong> ${rawValue.toLocaleString()}</p>` : ""}
                ${country.Real_GDP_per_Capita_USD !== undefined ? 
                  `<p><strong>GDP per Capita:</strong> $${country.Real_GDP_per_Capita_USD.toLocaleString()}</p>` : ''}
                ${country.electricity_access_percent !== undefined ? 
                  `<p><strong>Electricity Access:</strong> ${country.electricity_access_percent.toFixed(1)}%</p>` : ''}
                ${country.internet_users_per_100 !== undefined ? 
                  `<p><strong>Internet Users:</strong> ${country.internet_users_per_100.toFixed(1)} per 100</p>` : ''}
              </div>
            </div>
          `);

          layer.on("click", () => {
            if (onCountryClick) onCountryClick(country);
          });

          layer.on("mouseover", function() {
            this.setStyle({
              weight: 3,
              fillOpacity: 0.9,
            });
          });

          layer.on("mouseout", function() {
            geoJsonLayer.resetStyle(this);
          });
        }
      },
    });

    geoJsonLayer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = geoJsonLayer;

    // Zoom to active country
    if (activeCountry && activeCountry.latitude && activeCountry.longitude) {
      mapInstanceRef.current.setView(
        [activeCountry.latitude, activeCountry.longitude],
        4,
        { animate: true }
      );
    }
  }, [data, selectedMetric, onCountryClick, activeCountry, geoJsonData, highlightedCountries]);

  const findCountry = (geoJsonName: string): CountryData | undefined => {
    // Try exact match
    let country = countryLookup.current.get(geoJsonName.toUpperCase());
    if (country) return country;

    // Try normalized match
    const normalized = geoJsonName.toUpperCase()
      .replace(/,/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    country = countryLookup.current.get(normalized);
    if (country) return country;

    // Try partial matches
    for (const [key, value] of countryLookup.current.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return value;
      }
    }

    return undefined;
  };

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />
      {!geoJsonData && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Loading map data...</p>
          </div>
        </div>
      )}
    </div>
  );
};
