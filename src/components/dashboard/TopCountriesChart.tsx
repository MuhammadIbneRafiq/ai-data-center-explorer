import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TopCountriesChartProps {
  data: CountryData[];
  limit?: number;
  metric: keyof CountryData;
  activeCountry?: CountryData | null;
  onCountrySelect?: (country: CountryData) => void;
}

const metricLabels: Partial<Record<keyof CountryData, string>> = {
  renewableEnergyPercent: "Renewable Energy %",
  electricityCost: "Electricity Cost ($/kWh)",
  internetSpeed: "Internet Metric",
  gdpPerCapita: "GDP per Capita",
};

export const TopCountriesChart = ({
  data,
  limit = 10,
  metric,
  activeCountry,
  onCountrySelect,
}: TopCountriesChartProps) => {
  const metricLabel = metricLabels[metric] ?? String(metric);

  const withValues = data.filter((c) => {
    const value = c[metric];
    return typeof value === "number" && !Number.isNaN(value);
  });

  const topCountries = withValues
    .slice()
    .sort((a, b) => {
      const aValue = (a[metric] as number) ?? 0;
      const bValue = (b[metric] as number) ?? 0;
      return bValue - aValue;
    })
    .slice(0, limit)
    .map((c) => ({
      country: c,
      name: c.country.length > 12 ? c.country.slice(0, 12) + "..." : c.country,
      value: c[metric] as number,
    }));

  return (
    <Card className="glass-panel p-6 space-y-4">
      <h3 className="text-lg font-bold">Top Countries by {metricLabel}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topCountries}
            layout="vertical"
            margin={{ left: 80, right: 20 }}
          >
            <XAxis
              type="number"
              dataKey="value"
              domain={[0, "dataMax"]}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value.toFixed(2), metricLabel]}
            />
            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              onClick={(_, index) => {
                const item = topCountries[index];
                if (item && onCountrySelect) {
                  onCountrySelect(item.country);
                }
              }}
            >
              {topCountries.map((item) => {
                const isActive =
                  activeCountry &&
                  activeCountry.countryCode === item.country.countryCode;
                return (
                  <Cell
                    key={item.country.countryCode ?? item.country.country}
                    fill={
                      isActive
                        ? "hsl(var(--chart-3))"
                        : "hsl(var(--chart-1))"
                    }
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
