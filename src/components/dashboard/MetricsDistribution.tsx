import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from "recharts";

interface MetricsDistributionProps {
  data: CountryData[];
}

export const MetricsDistribution = ({ data }: MetricsDistributionProps) => {
  const scatterData = data
    .filter(
      (c) =>
        c.renewableEnergyPercent !== undefined &&
        c.co2Emissions !== undefined &&
        c.internetSpeed !== undefined,
    )
    .map((c) => ({
      x: c.renewableEnergyPercent as number,
      y: c.co2Emissions as number,
      z: c.internetSpeed as number,
      name: c.country,
    }));

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold">Energy vs Emissions & Connectivity</h3>
        <p className="text-sm text-muted-foreground">
          Bubble size represents internet metric (higher means more connectivity)
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
              name="CO₂ Emissions (Mt)"
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: 'CO₂ Emissions (Mt)',
                angle: -90,
                position: 'left',
                fill: 'hsl(var(--muted-foreground))',
              }}
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
                if (name === 'y') return [`${value.toFixed(1)} Mt`, 'CO₂ Emissions'];
                if (name === 'z') return [value.toFixed(1), 'Internet Metric'];
                return [value.toFixed(1), name];
              }}
            />
            <Scatter data={scatterData} fill="hsl(var(--chart-2))" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
