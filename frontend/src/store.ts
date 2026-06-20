import { create } from 'zustand'
import {
  Incident,
  WebSocketMessage,
  AIRecommendation,
  ResourceAllocation,
  SimulationParams,
  SimulationResult,
  NLCommandResponse,
} from './types'

export type ModuleTab = 'fire' | 'risk' | 'weather' | 'damage' | 'smoke'
export type DashboardView = 'command' | 'simulation' | 'timeline' | 'resources' | 'impact' | 'memory' | 'map'

// ─── AI Mock Logic ────────────────────────────────────────────────────────────
function generateAIRecommendations(incident: Incident): AIRecommendation[] {
  const recs: AIRecommendation[] = []
  const score = incident.risk?.score ?? 0
  const wind = incident.risk?.weather_data?.wind_speed ?? 0
  const humidity = incident.risk?.weather_data?.humidity ?? 50

  if (score >= 80) {
    recs.push({ priority: 'CRITICAL', action: 'Immediate evacuation of Zone A and B', reason: 'Risk score exceeds critical threshold', zone: 'Zone A/B' })
    recs.push({ priority: 'CRITICAL', action: 'Deploy all available aerial assets', reason: 'Fire spread rate too high for ground crews alone', zone: 'Active Front' })
  }
  if (wind > 40) {
    recs.push({ priority: 'HIGH', action: 'Reposition fire crews away from downwind flank', reason: `Wind speed ${wind.toFixed(0)} km/h creates dangerous spotting risk`, zone: 'Downwind' })
  }
  if (humidity < 20) {
    recs.push({ priority: 'HIGH', action: 'Pre-treat vegetation in buffer zones', reason: `Humidity at ${humidity.toFixed(0)}% — extreme fire behavior expected`, zone: 'Buffer Zone' })
  }
  recs.push({ priority: 'MEDIUM', action: 'Establish water supply at LZ-Alpha', reason: 'Projected spread will threaten access road in 2 hours', zone: 'LZ-Alpha' })
  recs.push({ priority: 'LOW', action: 'Notify downstream municipalities', reason: 'Smoke AQI may exceed safe limits within 4 hours' })
  return recs
}

function generateResources(incident: Incident): ResourceAllocation[] {
  const score = incident.risk?.score ?? 0
  return [
    { zone: 'Zone A (Active Front)', fire_trucks: score > 70 ? 4 : 2, personnel: score > 70 ? 24 : 12, aircraft: score > 70 ? 2 : 1, status: 'DEPLOYED' },
    { zone: 'Zone B (Flank)', fire_trucks: 2, personnel: 16, aircraft: 1, status: 'STAGING' },
    { zone: 'Zone C (Buffer)', fire_trucks: 1, personnel: 8, aircraft: 0, status: 'AVAILABLE' },
  ]
}

// ─── Incident Router ──────────────────────────────────────────────────────────
function routeMessage(incident: Incident, message: WebSocketMessage): Incident {
  const updated = { ...incident, updated_at: new Date().toISOString() }
  const timeline = [...(incident.timeline ?? [])]

  switch (message.type) {
    case 'detection_new':
      updated.detection = message.data
      updated.status = 'ACTIVE'
      updated.severity = message.data.confidence > 0.85 ? 'CRITICAL' : 'HIGH'
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'detection',
        title: '🔥 Fire Detected',
        description: `${message.data.source} detected fire at ${message.data.location_name ?? `${message.data.lat.toFixed(3)}°N`} with ${(message.data.confidence * 100).toFixed(0)}% confidence`,
        severity: 'critical',
      })
      break
    case 'risk_update':
      updated.risk = message.data
      updated.severity = message.data.score >= 80 ? 'CRITICAL' : message.data.score >= 60 ? 'HIGH' : 'MODERATE'
      updated.ai_recommendations = generateAIRecommendations({ ...updated, risk: message.data })
      updated.resources = generateResources({ ...updated, risk: message.data })
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'risk_update',
        title: '⚠️ Risk Model Updated',
        description: `Risk score: ${message.data.score.toFixed(0)}/100 — ${message.data.danger_level ?? 'HIGH'}`,
        severity: message.data.score >= 80 ? 'critical' : message.data.score >= 60 ? 'warning' : 'info',
      })
      break
    case 'simulation_frame':
      updated.simulation = [...(incident.simulation ?? []), message.data]
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'simulation',
        title: '📡 Spread Simulation Updated',
        description: `Fire spread projected to +${message.data.minute_offset} minutes`,
        severity: 'warning',
      })
      break
    case 'impact_update':
      updated.impact = message.data
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'impact',
        title: '💥 Impact Assessment Updated',
        description: `${message.data.trees_lost.toLocaleString()} trees, ${message.data.population_affected?.toLocaleString() ?? '—'} people affected`,
        severity: 'critical',
      })
      break
    case 'report_ready':
      updated.report = message.data
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'report',
        title: '📋 Incident Report Generated',
        description: 'Full AI incident report is now available',
        severity: 'info',
      })
      break
    case 'satellite_hotspot':
      updated.satellite_hotspots = [...(incident.satellite_hotspots ?? []), message.data]
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'satellite',
        title: '🛰️ Satellite Hotspot Detected',
        description: `NASA FIRMS hotspot at ${message.data.lat.toFixed(3)}°N, ${message.data.lng.toFixed(3)}°E`,
        severity: 'warning',
      })
      break
    case 'smoke_detection':
      updated.smoke = message.data
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'smoke',
        title: '💨 Smoke Detection Updated',
        description: `Level: ${message.data.smoke_level} — AQI: ${message.data.aqi}`,
        severity: message.data.aqi > 150 ? 'critical' : 'warning',
      })
      break
    case 'weather_fire':
      updated.weather_fire = message.data
      timeline.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'weather',
        title: '🌡️ Fire Weather Index Updated',
        description: `FWI: ${message.data.fwi.toFixed(1)} — Danger: ${message.data.danger_rating}`,
        severity: message.data.danger_rating === 'EXTREME' ? 'critical' : 'warning',
      })
      break
  }

  updated.timeline = timeline
  return updated
}

// ─── Historical Mock Data ─────────────────────────────────────────────────────
const HISTORICAL_FIRES = [
  { id: 'HF-001', location: 'Chitwan Forest, Chitwan', date: '2024-03-15', conditions: 'High wind (55 km/h), Low humidity (18%), Dry season', outcome: 'Contained after 72 hrs, 1200 ha burned', similarity_pct: 87 },
  { id: 'HF-002', location: 'Shivapuri Hills, Kathmandu', date: '2023-04-02', conditions: 'Strong NE wind, Low rainfall, Dense forest', outcome: 'Controlled in 48 hrs, 340 ha burned', similarity_pct: 74 },
  { id: 'HF-003', location: 'Lamtang Valley, Rasuwa', date: '2022-05-10', conditions: 'Extreme drought, High temperature (38°C)', outcome: 'Major incident, 2800 ha burned, 3 villages evacuated', similarity_pct: 61 },
]

// ─── Store ────────────────────────────────────────────────────────────────────
interface IncidentStore {
  incidents: Incident[]
  selectedIncidentId: string | null
  wsConnected: boolean
  lastAlert: string | null
  activeModule: ModuleTab
  activeDashboardView: DashboardView
  simParams: SimulationParams
  simResult: SimulationResult | null
  isSimRunning: boolean

  addOrUpdateIncident: (message: WebSocketMessage) => void
  selectIncident: (id: string | null) => void
  setWSConnected: (connected: boolean) => void
  setLastAlert: (alert: string | null) => void
  setActiveModule: (module: ModuleTab) => void
  setActiveDashboardView: (view: DashboardView) => void
  setSimParams: (params: Partial<SimulationParams>) => void
  runSimulation: (incidentId?: string) => void
  addNLCommand: (incidentId: string, cmd: NLCommandResponse) => void
  getIncidentById: (id: string) => Incident | undefined
  getLatestIncidents: (limit?: number) => Incident[]
  getActiveIncident: () => Incident | null
}

const DEFAULT_SIM_PARAMS: SimulationParams = {
  wind_speed: 35,
  wind_direction: 'NE',
  humidity: 25,
  temperature: 32,
  fuel_dryness: 3,
  terrain_slope: 15,
  rainfall: 0,
  duration_hours: 6,
}

function computeSimResult(params: SimulationParams, incident: Incident | null): SimulationResult {
  const windFactor = params.wind_speed / 50
  const humidityFactor = (100 - params.humidity) / 100
  const fuelFactor = params.fuel_dryness / 4
  const slopeFactor = params.terrain_slope / 45
  const rainFactor = Math.max(0, 1 - params.rainfall / 25)
  const base = (windFactor * 0.35 + humidityFactor * 0.25 + fuelFactor * 0.2 + slopeFactor * 0.1 + rainFactor * 0.1) * params.duration_hours

  const area_growth_pct = Math.round(base * 80)
  const predicted_spread_km = +(base * 12).toFixed(1)
  const threat_score = (windFactor + humidityFactor + fuelFactor) / 3
  const threat_level = threat_score > 0.8 ? 'EXTREME' : threat_score > 0.65 ? 'VERY_HIGH' : threat_score > 0.5 ? 'HIGH' : threat_score > 0.35 ? 'MODERATE' : 'LOW'
  const current_ha = incident?.detection?.area_ha ?? 50
  const predicted_area_ha = Math.round(current_ha * (1 + area_growth_pct / 100))

  return {
    predicted_spread_km,
    area_growth_pct,
    threat_level,
    eta_hours: params.duration_hours,
    predicted_area_ha,
    affected_zones: ['Zone A (Active Front)', 'Zone B (NE Flank)', threat_score > 0.6 ? 'Zone C (Buffer)' : ''].filter(Boolean),
    timestamp: new Date().toISOString(),
  }
}

export const useIncidentStore = create<IncidentStore>((set, get) => ({
  incidents: [],
  selectedIncidentId: null,
  wsConnected: false,
  lastAlert: null,
  activeModule: 'fire',
  activeDashboardView: 'command',
  simParams: DEFAULT_SIM_PARAMS,
  simResult: null,
  isSimRunning: false,

  addOrUpdateIncident: (message: WebSocketMessage) => {
    set((state) => {
      const { incidents } = state
      const existingIndex = incidents.findIndex((inc) => inc.id === message.incident_id)

      if (existingIndex === -1) {
        const newIncident: Incident = {
          id: message.incident_id,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          timeline: [],
          historical_matches: HISTORICAL_FIRES,
        }
        const routed = routeMessage(newIncident, message)
        return { incidents: [routed, ...incidents] }
      } else {
        const updatedIncidents = [...incidents]
        updatedIncidents[existingIndex] = routeMessage({ ...updatedIncidents[existingIndex] }, message)
        return { incidents: updatedIncidents }
      }
    })
  },

  selectIncident: (id) => set({ selectedIncidentId: id }),
  setWSConnected: (connected) => set({ wsConnected: connected }),
  setLastAlert: (alert) => set({ lastAlert: alert }),
  setActiveModule: (module) => set({ activeModule: module }),
  setActiveDashboardView: (view) => set({ activeDashboardView: view }),
  setSimParams: (params) => set((s) => ({ simParams: { ...s.simParams, ...params } })),

  runSimulation: (incidentId) => {
    set({ isSimRunning: true })
    setTimeout(() => {
      const { simParams, incidents, selectedIncidentId } = get()
      const id = incidentId ?? selectedIncidentId ?? incidents[0]?.id
      const incident = incidents.find((i) => i.id === id) ?? null
      const result = computeSimResult(simParams, incident)
      set({ simResult: result, isSimRunning: false })
      if (id) {
        set((s) => ({
          incidents: s.incidents.map((inc) =>
            inc.id === id ? { ...inc, sim_params: simParams, sim_result: result } : inc
          ),
        }))
      }
    }, 1800)
  },

  addNLCommand: (incidentId, cmd) => {
    set((s) => ({
      incidents: s.incidents.map((inc) =>
        inc.id === incidentId
          ? { ...inc, nl_commands: [...(inc.nl_commands ?? []), cmd] }
          : inc
      ),
    }))
  },

  getIncidentById: (id) => get().incidents.find((inc) => inc.id === id),

  getLatestIncidents: (limit = 10) => get().incidents.slice(0, limit),

  getActiveIncident: () => {
    const { incidents, selectedIncidentId } = get()
    if (selectedIncidentId) return incidents.find((i) => i.id === selectedIncidentId) ?? incidents[0] ?? null
    return incidents[0] ?? null
  },
}))
