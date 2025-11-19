-- Create country_data table for AI Datacenter Location Analysis
CREATE TABLE public.country_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  
  -- Power & Energy factors
  renewable_energy_percent DECIMAL(5, 2),
  electricity_cost DECIMAL(10, 4),
  energy_stability_score DECIMAL(5, 2),
  transmission_capacity_score DECIMAL(5, 2),
  
  -- Water availability
  water_availability_score DECIMAL(5, 2),
  water_cost_index DECIMAL(10, 4),
  
  -- Climate factors
  average_temperature DECIMAL(5, 2),
  cooling_requirement_index DECIMAL(5, 2),
  natural_disaster_risk DECIMAL(5, 2),
  
  -- Economic factors
  gdp_per_capita DECIMAL(12, 2),
  corporate_tax_rate DECIMAL(5, 2),
  labor_cost_index DECIMAL(8, 2),
  land_price_index DECIMAL(10, 2),
  employment_rate DECIMAL(5, 2),
  
  -- Infrastructure factors
  internet_speed DECIMAL(8, 2),
  connectivity_score DECIMAL(5, 2),
  transportation_infrastructure_score DECIMAL(5, 2),
  available_land_score DECIMAL(5, 2),
  
  -- Regulatory & Stability
  political_stability_score DECIMAL(5, 2),
  regulatory_ease_score DECIMAL(5, 2),
  data_sovereignty_score DECIMAL(5, 2),
  
  -- Computed overall scores
  power_score DECIMAL(5, 2),
  sustainability_score DECIMAL(5, 2),
  economic_viability_score DECIMAL(5, 2),
  infrastructure_score DECIMAL(5, 2),
  risk_score DECIMAL(5, 2),
  overall_datacenter_score DECIMAL(5, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (but make it public readable for this use case)
ALTER TABLE public.country_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access for the dashboard
CREATE POLICY "Allow public read access to country data"
  ON public.country_data
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert/update (for CSV imports)
CREATE POLICY "Allow authenticated insert"
  ON public.country_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.country_data
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_country_data_country ON public.country_data(country);
CREATE INDEX idx_country_data_score ON public.country_data(overall_datacenter_score DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_country_data_updated_at
  BEFORE UPDATE ON public.country_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate overall datacenter score
CREATE OR REPLACE FUNCTION public.calculate_datacenter_score(country_id UUID)
RETURNS VOID AS $$
DECLARE
  power_weight DECIMAL := 0.30;
  sustainability_weight DECIMAL := 0.25;
  economic_weight DECIMAL := 0.20;
  infrastructure_weight DECIMAL := 0.15;
  risk_weight DECIMAL := 0.10;
  
  calc_power_score DECIMAL;
  calc_sustainability_score DECIMAL;
  calc_economic_score DECIMAL;
  calc_infrastructure_score DECIMAL;
  calc_risk_score DECIMAL;
  calc_overall_score DECIMAL;
BEGIN
  -- Calculate component scores from the country data
  SELECT
    -- Power score (renewable energy + cost + stability)
    COALESCE((renewable_energy_percent * 0.4 + (100 - electricity_cost * 100) * 0.3 + energy_stability_score * 0.3), 50),
    
    -- Sustainability score (renewable + water + climate)
    COALESCE((renewable_energy_percent * 0.5 + water_availability_score * 0.3 + (100 - natural_disaster_risk) * 0.2), 50),
    
    -- Economic viability (GDP + taxes + labor + land)
    COALESCE((LEAST(gdp_per_capita / 1000, 100) * 0.3 + (100 - corporate_tax_rate) * 0.25 + (100 - labor_cost_index) * 0.25 + (100 - land_price_index / 10) * 0.2), 50),
    
    -- Infrastructure score
    COALESCE((connectivity_score * 0.3 + transportation_infrastructure_score * 0.25 + available_land_score * 0.25 + LEAST(internet_speed / 5, 100) * 0.2), 50),
    
    -- Risk score (inverted - lower risk = higher score)
    COALESCE((political_stability_score * 0.4 + regulatory_ease_score * 0.3 + (100 - natural_disaster_risk) * 0.3), 50)
    
  INTO calc_power_score, calc_sustainability_score, calc_economic_score, calc_infrastructure_score, calc_risk_score
  FROM public.country_data
  WHERE id = country_id;
  
  -- Calculate weighted overall score
  calc_overall_score := (
    calc_power_score * power_weight +
    calc_sustainability_score * sustainability_weight +
    calc_economic_score * economic_weight +
    calc_infrastructure_score * infrastructure_weight +
    calc_risk_score * risk_weight
  );
  
  -- Update the scores
  UPDATE public.country_data
  SET
    power_score = calc_power_score,
    sustainability_score = calc_sustainability_score,
    economic_viability_score = calc_economic_score,
    infrastructure_score = calc_infrastructure_score,
    risk_score = calc_risk_score,
    overall_datacenter_score = calc_overall_score
  WHERE id = country_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;