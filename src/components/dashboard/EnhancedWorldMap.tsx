import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CountryData } from "@/types/country-data";
import { DatacenterLocation, loadDatacenterLocations, getCountryCoords, getFlagUrl } from "@/lib/datacenter-locations-loader";

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
  const datacenterMarkersRef = useRef<L.Marker[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [datacenterLocations, setDatacenterLocations] = useState<DatacenterLocation[]>([]);

  // Load GeoJSON data and datacenter locations
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
    
    // Load datacenter locations from CSV
    loadDatacenterLocations()
      .then(locations => {
        console.log("✅ Loaded datacenter locations:", locations.length);
        setDatacenterLocations(locations);
      })
      .catch(error => {
        console.error("❌ Error loading datacenter locations:", error);
      });
  }, []);

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

  // Add datacenter location markers with flags
  useEffect(() => {
    if (!mapInstanceRef.current || datacenterLocations.length === 0) return;

    // Clear existing datacenter markers
    datacenterMarkersRef.current.forEach((marker) => marker.remove());
    datacenterMarkersRef.current = [];

    datacenterLocations.forEach((dc) => {
      if (!dc.countryCode || dc.hyperscaleDatacenters === 0) return;
      
      const coords = getCountryCoords(dc.countryCode);
      if (!coords) return;

      // Create custom flag icon with circular border
      const flagIcon = L.divIcon({
        className: 'datacenter-flag-marker',
        html: `
          <div style="position: relative; cursor: pointer;">
            <div style="
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              overflow: hidden;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s;
            ">
              <img 
                src="${getFlagUrl(dc.countryCode)}" 
                alt="${dc.country} flag"
                style="width: 100%; height: 100%; object-fit: cover;"
                onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-size: 10px; font-weight: bold; color: #333;\\'>${dc.countryCode}</span>'"
              />
            </div>
            ${dc.hyperscaleDatacenters > 0 ? `
            <div style="
              position: absolute;
              bottom: -4px;
              right: -4px;
              background: #ef4444;
              color: white;
              font-size: 9px;
              font-weight: bold;
              border-radius: 9999px;
              min-width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 4px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              border: 1px solid white;
            ">
              ${dc.hyperscaleDatacenters}
            </div>
            ` : ''}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker(coords, { icon: flagIcon });

      // Create detailed tooltip
      marker.bindTooltip(`
        <div style="padding: 12px; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 8px;">
            <img src="${getFlagUrl(dc.countryCode)}" alt="" style="width: 24px; height: 16px; object-fit: cover; border-radius: 2px;"/>
            <span style="font-weight: 700; font-size: 14px;">${dc.country}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="opacity: 0.7;">Total Datacenters:</span>
              <span style="font-weight: 600; color: hsl(210, 100%, 50%);">${dc.totalDatacenters.toLocaleString()}</span>
            </div>
            ${dc.hyperscaleDatacenters > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="opacity: 0.7;">Hyperscale:</span>
                <span style="font-weight: 500;">${dc.hyperscaleDatacenters}</span>
              </div>
            ` : ''}
            ${dc.colocationDatacenters > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="opacity: 0.7;">Colocation:</span>
                <span style="font-weight: 500;">${dc.colocationDatacenters}</span>
              </div>
            ` : ''}
            ${dc.renewableEnergyUsage ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="opacity: 0.7;">Renewable Energy:</span>
                <span style="font-weight: 500; color: hsl(140, 70%, 45%);">${dc.renewableEnergyUsage}</span>
              </div>
            ` : ''}
            ${dc.keyOperators ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid hsl(var(--border));">
                <span style="opacity: 0.6; font-size: 10px;">Key Operators:</span>
                <p style="font-size: 10px; margin-top: 4px; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${dc.keyOperators}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `, {
        permanent: false,
        direction: 'top',
        offset: [0, -22],
        className: 'datacenter-tooltip',
      });

      marker.addTo(mapInstanceRef.current!);
      datacenterMarkersRef.current.push(marker);
    });
  }, [datacenterLocations]);

  // Update GeoJSON layer when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !geoJsonData) return;

    // Remove existing layer
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.remove();
    }

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: (feature) => {
        const countryName = feature?.properties?.ADMIN || feature?.properties?.name || "";
        const country = findCountry(countryName);
        
        // Default neutral styling; color is not tied to renewable energy or any metric
        let fillColor = "hsl(210, 8%, 18%)";
        let fillOpacity = 0.12;
        let weight = 0.5;
        let color = "hsl(210, 12%, 32%)";

        if (country) {
          // Highlight logic - emphasize only when brushed/selected
          if (highlightedCountries && highlightedCountries.size > 0) {
            if (highlightedCountries.has(country.countryCode)) {
              fillOpacity = 0.5;
              weight = 1.4;
              color = "hsl(200, 70%, 60%)";
              fillColor = "hsl(200, 60%, 40%)";
            } else {
              fillOpacity = 0.08;
            }
          }

          // Active country - only border emphasis, no new color
          if (activeCountry && activeCountry.countryCode === country.countryCode) {
            weight = 2.2;
            color = "hsl(200, 80%, 72%)";
            fillOpacity = 0.65;
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
