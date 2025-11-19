import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TopCountriesChartProps {
  data: CountryData[];
  limit?: number;
}

export const TopCountriesChart = ({ data, limit = 10 }: TopCountriesChartProps) => {
  const topCountries = [...data]
    .filter(c => c.aiDatacenterScore !== undefined)
    .sort((a, b) => (b.aiDatacenterScore || 0) - (a.aiDatacenterScore || 0))
    .slice(0, limit)
    .map(c => ({
      name: c.country.length > 12 ? c.country.slice(0, 12) + '...' : c.country,
      score: c.aiDatacenterScore || 0,
    }));

  const getBarColor = (score: number): string => {
    if (score >= 80) return "hsl(var(--region-excellent))";
    if (score >= 60) return "hsl(var(--region-good))";
    if (score >= 40) return "hsl(var(--region-moderate))";
    if (score >= 20) return "hsl(var(--region-poor))";
    return "hsl(var(--region-warning))";
  };

  return (
    <Card className="glass-panel p-6 space-y-4">
      <h3 className="text-lg font-bold">Top Countries for AI Datacenters</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topCountries} layout="vertical" margin={{ left: 80, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}/100`, 'Score']}
            />
            <Bar dataKey="score" radius={[0, 8, 8, 0]}>
              {topCountries.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
