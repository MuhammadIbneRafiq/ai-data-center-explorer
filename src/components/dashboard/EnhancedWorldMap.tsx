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

  // Sequential lightness scale following Munzner's channel effectiveness ranking
  // Using GREEN hue because human vision is most sensitive to green:
  // - Eyes have more green-sensitive (M) cones than red or blue
  // - Green contributes ~59% of perceived luminance (vs ~30% red, ~11% blue)
  // - We can discriminate MORE shades of green than any other hue
  // Convention: "more is darker" - higher values get lower lightness
  const getColorForLevel = (level: number | undefined): string => {
    if (level === undefined || Number.isNaN(level)) return "hsl(140, 10%, 18%)"; // No data: very dark, desaturated
    
    // Single-hue sequential scale: hue=140 (green), varying lightness
    // level 0 → lightness 88% (light green), level 100 → lightness 25% (dark green)
    const lightness = 88 - (level / 100) * 63; // Maps 0-100 to 88%-25% lightness
    const saturation = 45 + (level / 100) * 35; // 45% to 80% saturation
    return `hsl(140, ${saturation}%, ${lightness}%)`;
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
        
        // Minimal default styling - low contrast for countries without data
        let fillColor = "hsl(210, 5%, 20%)";
        let fillOpacity = 0.15;
        let weight = 0.5;
        let color = "hsl(210, 10%, 30%)";

        if (country) {
          const rawValue = country[selectedMetric as keyof CountryData] as number | undefined;
          if (typeof rawValue === "number" && !isNaN(rawValue)) {
            const level = ((rawValue - min) / range) * 100;
            fillColor = getColorForLevel(level);
            fillOpacity = 0.65;
          }

          // Highlight logic - subtle emphasis without extra colors
          if (highlightedCountries && highlightedCountries.size > 0) {
            if (highlightedCountries.has(country.countryCode)) {
              fillOpacity = 0.85;
              weight = 1.5;
              color = "hsl(210, 50%, 60%)";
            } else {
              fillOpacity = 0.15;
            }
          }

          // Active country - only border emphasis, no new color
          if (activeCountry && activeCountry.countryCode === country.countryCode) {
            weight = 2;
            color = "hsl(210, 60%, 70%)";
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

  // Format metric name for display
  const formatMetricName = (metric: string): string => {
    const names: Record<string, string> = {
      renewableEnergyPercent: "Renewable Energy %",
      gdpPerCapita: "GDP per Capita",
      Real_GDP_per_Capita_USD: "Real GDP per Capita (USD)",
      internet_users_per_100: "Internet Users per 100",
      internetSpeed: "Internet Speed",
      electricityCost: "Electricity Cost",
      averageTemperature: "Avg Temperature",
      electricity_access_percent: "Electricity Access %",
      total_literacy_rate: "Literacy Rate %",
    };
    return names[metric] || metric;
  };

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Sequential Lightness Legend */}
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border/50 z-[1000]">
        <p className="text-xs font-medium text-foreground mb-2">{formatMetricName(selectedMetric)}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Low</span>
          <div 
            className="h-3 w-24 rounded-sm"
            style={{
              background: "linear-gradient(to right, hsl(140, 45%, 88%), hsl(140, 80%, 25%))"
            }}
          />
          <span className="text-[10px] text-muted-foreground">High</span>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1 italic">Darker = higher value</p>
      </div>

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
