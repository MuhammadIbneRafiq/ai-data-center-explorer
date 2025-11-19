import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface MetricsDistributionProps {
  data: CountryData[];
}

export const MetricsDistribution = ({ data }: MetricsDistributionProps) => {
  const scatterData = data
    .filter(c => c.renewableEnergyPercent && c.electricityCost && c.aiDatacenterScore)
    .map(c => ({
      x: c.renewableEnergyPercent || 0,
      y: 100 - (c.electricityCost || 50),
      z: c.aiDatacenterScore || 50,
      name: c.country,
    }));

  const getColor = (score: number): string => {
    if (score >= 80) return "hsl(var(--region-excellent))";
    if (score >= 60) return "hsl(var(--region-good))";
    if (score >= 40) return "hsl(var(--region-moderate))";
    if (score >= 20) return "hsl(var(--region-poor))";
    return "hsl(var(--region-warning))";
  };

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold">Energy vs Cost Efficiency</h3>
        <p className="text-sm text-muted-foreground">
          Bubble size represents overall suitability score
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Renewable Energy %" 
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Renewable Energy %', position: 'bottom', fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Cost Efficiency" 
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Cost Efficiency', angle: -90, position: 'left', fill: 'hsl(var(--muted-foreground))' }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'x') return [`${value.toFixed(1)}%`, 'Renewable Energy'];
                if (name === 'y') return [value.toFixed(1), 'Cost Efficiency'];
                return [value.toFixed(1), 'Score'];
              }}
            />
            <Scatter data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.z)} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
