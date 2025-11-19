import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

interface ScoreBreakdownProps {
  data: CountryData[];
}

export const ScoreBreakdown = ({ data }: ScoreBreakdownProps) => {
  // Calculate averages
  const avgPower = data.reduce((acc, c) => acc + (c.powerScore || 0), 0) / data.length;
  const avgSustainability = data.reduce((acc, c) => acc + (c.sustainabilityScore || 0), 0) / data.length;
  const avgEconomic = data.reduce((acc, c) => acc + (c.economicScore || 0), 0) / data.length;
  const avgInfrastructure = data.reduce((acc, c) => acc + (c.infrastructureScore || 0), 0) / data.length;
  const avgRisk = data.reduce((acc, c) => acc + (c.riskScore || 0), 0) / data.length;

  const chartData = [
    { category: "Power & Energy", score: avgPower, weight: "30%", color: "hsl(var(--chart-1))" },
    { category: "Sustainability", score: avgSustainability, weight: "25%", color: "hsl(var(--chart-3))" },
    { category: "Economic", score: avgEconomic, weight: "20%", color: "hsl(var(--chart-4))" },
    { category: "Infrastructure", score: avgInfrastructure, weight: "15%", color: "hsl(var(--chart-2))" },
    { category: "Risk Profile", score: avgRisk, weight: "10%", color: "hsl(var(--chart-5))" },
  ];

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold">Score Components Breakdown</h3>
        <p className="text-sm text-muted-foreground">
          Average scores across all filtered countries
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 30 }}>
            <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
            <YAxis 
              type="category" 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))"
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}/100`, 'Average Score']}
            />
            <Legend 
              content={() => (
                <div className="flex justify-center gap-6 mt-4 text-xs">
                  {chartData.map((entry) => (
                    <div key={entry.category} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">{entry.weight} weight</span>
                    </div>
                  ))}
                </div>
              )}
            />
            <Bar dataKey="score" radius={[0, 8, 8, 0]}>
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
