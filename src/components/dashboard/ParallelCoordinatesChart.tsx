import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ParallelCoordinatesChartProps {
  data: CountryData[];
  selectedCountry?: CountryData | null;
  onCountrySelect?: (country: CountryData) => void;
}

interface Dimension {
  key: keyof CountryData;
  label: string;
}

export const ParallelCoordinatesChart = ({
  data,
  selectedCountry,
  onCountrySelect,
}: ParallelCoordinatesChartProps) => {
  const dimensions: Dimension[] = [
    { key: "gdpPerCapita", label: "GDP per Capita" },
    { key: "co2Emissions", label: "CO Emissions (Mt)" },
    { key: "electricityCapacityKw", label: "Electric Capacity (kW)" },
    { key: "renewableEnergyPercent", label: "Renewables (%)" },
    { key: "internetUsers", label: "Internet Users" },
  ];

  const candidates = data.filter((c) =>
    dimensions.some((dim) =>
      typeof c[dim.key] === "number" && !Number.isNaN(c[dim.key] as number),
    ),
  );

  const keyCountries = candidates.slice(0, 6);

  if (keyCountries.length === 0) {
    return (
      <Card className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold">Key Factors (Parallel Coordinates)</h3>
        <p className="text-sm text-muted-foreground">
          Not enough data to display this view for the current filters.
        </p>
      </Card>
    );
  }

  const ranges: Record<string, { min: number; max: number } | null> = {};

  dimensions.forEach((dim) => {
    const values = keyCountries
      .map((c) => c[dim.key] as number | undefined)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    if (!values.length) {
      ranges[dim.key] = null;
      return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    ranges[dim.key] = { min, max };
  });

  const chartData = dimensions.map((dim) => {
    const row: Record<string, number | string> = {
      dimension: dim.label,
    };

    const range = ranges[dim.key];

    keyCountries.forEach((country) => {
      const raw = country[dim.key] as number | undefined;
      const id = country.countryCode || country.country;
      if (typeof raw !== "number" || Number.isNaN(raw) || !range) {
        row[id] = 0;
        return;
      }

      const { min, max } = range;
      const denom = max - min;
      const value = denom === 0 ? 50 : ((raw - min) / denom) * 100;
      row[id] = value;
    });

    return row;
  });

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
  ];

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold">Key Factors (Parallel Coordinates)</h3>
        <p className="text-sm text-muted-foreground">
          Normalized comparison of GDP, emissions, energy capacity, renewables, and
          connectivity for key countries.
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              dataKey="dimension"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: "Normalized (0-100)",
                angle: -90,
                position: "left",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {keyCountries.map((country, index) => {
              const id = country.countryCode || country.country;
              const isActive =
                selectedCountry &&
                selectedCountry.countryCode === country.countryCode;
              const color = colors[index % colors.length];

              return (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={country.country}
                  stroke={isActive ? "hsl(var(--chart-3))" : color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  onClick={() => onCountrySelect && onCountrySelect(country)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
