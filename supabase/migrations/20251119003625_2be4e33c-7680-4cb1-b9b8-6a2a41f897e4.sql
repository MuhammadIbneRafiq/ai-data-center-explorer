-- Fix search_path security warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;

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
  SELECT
    COALESCE((renewable_energy_percent * 0.4 + (100 - electricity_cost * 100) * 0.3 + energy_stability_score * 0.3), 50),
    COALESCE((renewable_energy_percent * 0.5 + water_availability_score * 0.3 + (100 - natural_disaster_risk) * 0.2), 50),
    COALESCE((LEAST(gdp_per_capita / 1000, 100) * 0.3 + (100 - corporate_tax_rate) * 0.25 + (100 - labor_cost_index) * 0.25 + (100 - land_price_index / 10) * 0.2), 50),
    COALESCE((connectivity_score * 0.3 + transportation_infrastructure_score * 0.25 + available_land_score * 0.25 + LEAST(internet_speed / 5, 100) * 0.2), 50),
    COALESCE((political_stability_score * 0.4 + regulatory_ease_score * 0.3 + (100 - natural_disaster_risk) * 0.3), 50)
  INTO calc_power_score, calc_sustainability_score, calc_economic_score, calc_infrastructure_score, calc_risk_score
  FROM public.country_data
  WHERE id = country_id;
  
  calc_overall_score := (
    calc_power_score * power_weight +
    calc_sustainability_score * sustainability_weight +
    calc_economic_score * economic_weight +
    calc_infrastructure_score * infrastructure_weight +
    calc_risk_score * risk_weight
  );
  
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;