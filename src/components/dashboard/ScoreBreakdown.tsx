import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ScoreBreakdownProps {
  data: CountryData[];
}

export const ScoreBreakdown = ({ data }: ScoreBreakdownProps) => {
  // Calculate averages
  const safeAverage = (values: Array<number | undefined>): number | undefined => {
    const nums = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    if (nums.length === 0) return undefined;
    return nums.reduce((sum, v) => sum + v, 0) / nums.length;
  };

  const avgRenewable = safeAverage(data.map((c) => c.renewableEnergyPercent));
  const avgElectricityCost = safeAverage(data.map((c) => c.electricityCost));
  const avgGdpPerCapita = safeAverage(data.map((c) => c.gdpPerCapita));
  const avgInternetMetric = safeAverage(data.map((c) => c.internetSpeed));

  const chartData = [
    {
      category: "Renewable Energy %",
      value: avgRenewable ?? 0,
      color: "hsl(var(--chart-1))",
    },
    {
      category: "Electricity Cost ($/kWh)",
      value: avgElectricityCost ?? 0,
      color: "hsl(var(--chart-4))",
    },
    {
      category: "GDP per Capita",
      value: avgGdpPerCapita ?? 0,
      color: "hsl(var(--chart-2))",
    },
    {
      category: "Internet Metric",
      value: avgInternetMetric ?? 0,
      color: "hsl(var(--chart-3))",
    },
  ];

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold">Metric Averages (Filtered)</h3>
        <p className="text-sm text-muted-foreground">
          Average values across all filtered countries
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 160, right: 30 }}>
            <XAxis
              type="number"
              dataKey="value"
              domain={[0, "dataMax"]}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              type="category" 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))"
              width={160}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [value.toFixed(2), 'Average Value']}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
