export interface DetectionData {
  lat: number
  lng: number
  timestamp: string
  confidence: number
  source: string
  location_name?: string
  altitude?: number
  area_ha?: number
}

export interface RiskUpdateData {
  score: number
  feature_importance: Record<string, number>
  weather_data: {
    wind_speed: number
    temperature: number
    humidity: number
    wind_direction?: number
  }
  danger_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME'
}

export interface SimulationFrameData {
  minute_offset: number
  polygon_geojson: any
}

export interface ImpactUpdateData {
  trees_lost: number
  wildlife_affected: number
  co2_tons: number
  dollar_damage: number
  area_burned_ha?: number
  structures_threatened?: number
  population_affected?: number
  roads_affected?: number
  critical_infrastructure?: string[]
  buildings_threatened?: number
}

export interface ReportReadyData {
  content: string
}

export interface SatelliteHotspotData {
  lat: number
  lng: number
  confidence: number
  source: 'NASA_FIRMS' | string
}

export interface SmokeDetectionData {
  smoke_level: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'DENSE'
  aqi: number
  visibility_km: number
  plume_direction: number
  plume_speed_kmh: number
  co_ppm: number
  pm25: number
  pm10: number
  detected_at: string
}

export interface WeatherFireData {
  ffmc: number
  dmc: number
  dc: number
  isi: number
  bui: number
  fwi: number
  danger_rating: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME'
  temp: number
  humidity: number
  wind_speed: number
  wind_direction: number
  rain_mm: number
  recorded_at: string
}

// ─── New Extended Types ───────────────────────────────────────────────────────

export interface AIRecommendation {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  action: string
  reason: string
  zone?: string
}

export interface ResourceAllocation {
  zone: string
  fire_trucks: number
  personnel: number
  aircraft: number
  status: 'DEPLOYED' | 'STAGING' | 'AVAILABLE'
}

export interface TimelineEvent {
  id: string
  timestamp: string
  type: 'detection' | 'risk_update' | 'simulation' | 'impact' | 'report' | 'resource' | 'command' | 'satellite' | 'smoke' | 'weather'
  title: string
  description: string
  severity?: 'info' | 'warning' | 'critical'
}

export interface SimulationParams {
  wind_speed: number
  wind_direction: string
  humidity: number
  temperature: number
  fuel_dryness: number
  terrain_slope: number
  rainfall: number
  duration_hours: 1 | 6 | 12 | 24
}

export interface SimulationResult {
  predicted_spread_km: number
  area_growth_pct: number
  threat_level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME'
  eta_hours: number
  predicted_area_ha: number
  affected_zones: string[]
  timestamp: string
}

export interface HistoricalFire {
  id: string
  location: string
  date: string
  conditions: string
  outcome: string
  similarity_pct: number
}

export interface NLCommandResponse {
  query: string
  response: string
  data?: any
  timestamp: string
}

export type WebSocketMessage =
  | { type: 'detection_new'; incident_id: string; data: DetectionData }
  | { type: 'risk_update'; incident_id: string; data: RiskUpdateData }
  | { type: 'simulation_frame'; incident_id: string; data: SimulationFrameData }
  | { type: 'impact_update'; incident_id: string; data: ImpactUpdateData }
  | { type: 'report_ready'; incident_id: string; data: ReportReadyData }
  | { type: 'satellite_hotspot'; incident_id: string; data: SatelliteHotspotData }
  | { type: 'smoke_detection'; incident_id: string; data: SmokeDetectionData }
  | { type: 'weather_fire'; incident_id: string; data: WeatherFireData }

export interface Incident {
  id: string
  detection?: DetectionData
  risk?: RiskUpdateData
  simulation?: SimulationFrameData[]
  impact?: ImpactUpdateData
  report?: ReportReadyData
  satellite_hotspots?: SatelliteHotspotData[]
  smoke?: SmokeDetectionData
  weather_fire?: WeatherFireData
  // Extended
  ai_recommendations?: AIRecommendation[]
  resources?: ResourceAllocation[]
  timeline?: TimelineEvent[]
  sim_params?: SimulationParams
  sim_result?: SimulationResult
  historical_matches?: HistoricalFire[]
  nl_commands?: NLCommandResponse[]
  status?: 'ACTIVE' | 'CONTAINED' | 'CONTROLLED' | 'EXTINGUISHED'
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  created_at: string
  updated_at: string
}
