export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      country_data: {
        Row: {
          available_land_score: number | null
          average_temperature: number | null
          connectivity_score: number | null
          cooling_requirement_index: number | null
          corporate_tax_rate: number | null
          country: string
          country_code: string
          created_at: string | null
          data_sovereignty_score: number | null
          economic_viability_score: number | null
          electricity_cost: number | null
          employment_rate: number | null
          energy_stability_score: number | null
          gdp_per_capita: number | null
          id: string
          infrastructure_score: number | null
          internet_speed: number | null
          labor_cost_index: number | null
          land_price_index: number | null
          latitude: number
          longitude: number
          natural_disaster_risk: number | null
          overall_datacenter_score: number | null
          political_stability_score: number | null
          power_score: number | null
          regulatory_ease_score: number | null
          renewable_energy_percent: number | null
          risk_score: number | null
          sustainability_score: number | null
          transmission_capacity_score: number | null
          transportation_infrastructure_score: number | null
          updated_at: string | null
          water_availability_score: number | null
          water_cost_index: number | null
        }
        Insert: {
          available_land_score?: number | null
          average_temperature?: number | null
          connectivity_score?: number | null
          cooling_requirement_index?: number | null
          corporate_tax_rate?: number | null
          country: string
          country_code: string
          created_at?: string | null
          data_sovereignty_score?: number | null
          economic_viability_score?: number | null
          electricity_cost?: number | null
          employment_rate?: number | null
          energy_stability_score?: number | null
          gdp_per_capita?: number | null
          id?: string
          infrastructure_score?: number | null
          internet_speed?: number | null
          labor_cost_index?: number | null
          land_price_index?: number | null
          latitude: number
          longitude: number
          natural_disaster_risk?: number | null
          overall_datacenter_score?: number | null
          political_stability_score?: number | null
          power_score?: number | null
          regulatory_ease_score?: number | null
          renewable_energy_percent?: number | null
          risk_score?: number | null
          sustainability_score?: number | null
          transmission_capacity_score?: number | null
          transportation_infrastructure_score?: number | null
          updated_at?: string | null
          water_availability_score?: number | null
          water_cost_index?: number | null
        }
        Update: {
          available_land_score?: number | null
          average_temperature?: number | null
          connectivity_score?: number | null
          cooling_requirement_index?: number | null
          corporate_tax_rate?: number | null
          country?: string
          country_code?: string
          created_at?: string | null
          data_sovereignty_score?: number | null
          economic_viability_score?: number | null
          electricity_cost?: number | null
          employment_rate?: number | null
          energy_stability_score?: number | null
          gdp_per_capita?: number | null
          id?: string
          infrastructure_score?: number | null
          internet_speed?: number | null
          labor_cost_index?: number | null
          land_price_index?: number | null
          latitude?: number
          longitude?: number
          natural_disaster_risk?: number | null
          overall_datacenter_score?: number | null
          political_stability_score?: number | null
          power_score?: number | null
          regulatory_ease_score?: number | null
          renewable_energy_percent?: number | null
          risk_score?: number | null
          sustainability_score?: number | null
          transmission_capacity_score?: number | null
          transportation_infrastructure_score?: number | null
          updated_at?: string | null
          water_availability_score?: number | null
          water_cost_index?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_datacenter_score: {
        Args: { country_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
