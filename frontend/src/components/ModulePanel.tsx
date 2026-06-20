import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIncidentStore, ModuleTab } from '../store'
import {
  Flame,
  TrendingUp,
  Cloud,
  AlertTriangle,
  Wind,
  Thermometer,
  Droplets,
  TreePine,
  Bird,
  Factory,
  DollarSign,
  Eye,
  Navigation,
} from 'lucide-react'
import { Incident } from '../types'


// ─── Helpers ────────────────────────────────────────────────────────────────

function getRiskColor(score: number) {
  if (score >= 80) return { text: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500' }
  if (score >= 60) return { text: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500' }
  if (score >= 40) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500' }
  return { text: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500' }
}

function getRiskLabel(score: number) {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MODERATE'
  return 'LOW'
}

function getDangerColor(rating: string) {
  const map: Record<string, string> = {
    LOW: 'text-green-400 bg-green-900/50 border-green-700',
    MODERATE: 'text-yellow-400 bg-yellow-900/50 border-yellow-700',
    HIGH: 'text-orange-400 bg-orange-900/50 border-orange-700',
    VERY_HIGH: 'text-red-400 bg-red-900/50 border-red-700',
    EXTREME: 'text-purple-400 bg-purple-900/50 border-purple-700',
  }
  return map[rating] || 'text-slate-400 bg-slate-800 border-slate-700'
}

function getSmokeColor(level: string) {
  const map: Record<string, string> = {
    NONE: 'text-green-400',
    LIGHT: 'text-yellow-300',
    MODERATE: 'text-amber-400',
    HEAVY: 'text-orange-500',
    DENSE: 'text-red-500',
  }
  return map[level] || 'text-slate-400'
}

function getAqiColor(aqi: number) {
  if (aqi <= 50) return '#22c55e'
  if (aqi <= 100) return '#eab308'
  if (aqi <= 150) return '#f97316'
  if (aqi <= 200) return '#ef4444'
  if (aqi <= 300) return '#8b5cf6'
  return '#7f1d1d'
}

function getAqiLabel(aqi: number) {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy (Sensitive)'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  max,
  color = 'bg-fire-orange',
}: {
  label: string
  value: number
  max: number
  color?: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-slate-200">{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color = 'text-slate-100',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
  color?: string
}) {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color} font-mono leading-none`}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-slate-500 gap-2">
      {icon}
      <p className="text-xs text-center">{message}</p>
    </div>
  )
}

// ─── Module Tabs ─────────────────────────────────────────────────────────────

function FireDetectionTab({ incident }: { incident: Incident | null }) {
  if (!incident?.detection) {
    return (
      <EmptyState
        icon={<Flame size={28} className="opacity-30" />}
        message="No fire detection data. Waiting for camera network..."
      />
    )
  }
  const d = incident.detection
  const conf = d.confidence * 100

  return (
    <div className="space-y-4">
      {/* Confidence Gauge */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Detection Confidence</p>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#334155" strokeWidth="8" />
              <motion.circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke={conf >= 90 ? '#ef4444' : conf >= 70 ? '#f97316' : '#fbbf24'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - conf / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center rotate-0">
              <span className="text-xl font-bold text-white">{conf.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-slate-400">Source</p>
              <p className="text-sm font-semibold text-slate-100">{d.source}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Detected At</p>
              <p className="text-sm text-slate-200 font-mono">
                {new Date(d.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Location Details */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">📍 Location</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Latitude</p>
            <p className="text-sm font-mono text-slate-100">{d.lat.toFixed(5)}°N</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Longitude</p>
            <p className="text-sm font-mono text-slate-100">{d.lng.toFixed(5)}°E</p>
          </div>
          {d.location_name && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Region</p>
              <p className="text-sm font-semibold text-fire-orange">{d.location_name}</p>
            </div>
          )}
          {d.area_ha && (
            <div>
              <p className="text-xs text-slate-500">Area</p>
              <p className="text-sm font-mono text-slate-100">{d.area_ha.toFixed(1)} ha</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RiskModelTab({ incident }: { incident: Incident | null }) {
  if (!incident?.risk) {
    return (
      <EmptyState
        icon={<TrendingUp size={28} className="opacity-30" />}
        message="Risk model calculating... awaiting detection data."
      />
    )
  }

  const risk = incident.risk
  const score = risk.score
  const colors = getRiskColor(score)
  const label = getRiskLabel(score)
  const topFeatures = Object.entries(risk.feature_importance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  const featureColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500',
    'bg-yellow-500', 'bg-lime-500', 'bg-green-500',
  ]

  return (
    <div className="space-y-4">
      {/* Risk Score Arc */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Risk Score</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getDangerColor(label)}`}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="12" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 40 ? '#fbbf24' : '#22c55e'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black ${colors.text}`}>{Math.round(score)}</span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {risk.weather_data && (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Thermometer size={12} className="text-red-400" />
                  {risk.weather_data.temperature.toFixed(1)}°C
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Wind size={12} className="text-blue-400" />
                  {risk.weather_data.wind_speed.toFixed(1)} km/h
                  {risk.weather_data.wind_direction !== undefined && (
                    <span className="text-slate-500">@ {risk.weather_data.wind_direction}°</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Droplets size={12} className="text-cyan-400" />
                  {risk.weather_data.humidity.toFixed(0)}% RH
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feature Importance */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Risk Factors</p>
        <div className="space-y-2.5">
          {topFeatures.map(([feature, val], i) => (
            <MetricBar
              key={feature}
              label={feature.replace(/_/g, ' ')}
              value={val * 100}
              max={100}
              color={featureColors[i]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function WeatherFireTab({ incident }: { incident: Incident | null }) {
  if (!incident?.weather_fire) {
    return (
      <EmptyState
        icon={<Cloud size={28} className="opacity-30" />}
        message="Weather-fire index not yet computed for this incident."
      />
    )
  }

  const wf = incident.weather_fire
  const dangerClass = getDangerColor(wf.danger_rating)

  return (
    <div className="space-y-4">
      {/* FWI Overview */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Fire Weather Index</p>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${dangerClass}`}>
            {wf.danger_rating}
          </span>
        </div>
        <div className="text-center">
          <motion.div
            className="text-5xl font-black text-fire-orange"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {wf.fwi.toFixed(1)}
          </motion.div>
          <p className="text-xs text-slate-400 mt-1">FWI Score</p>
        </div>
      </div>

      {/* FWI Sub-indices */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">FWI Components</p>
        <div className="space-y-2.5">
          <MetricBar label="FFMC (Fine Fuel Moisture)" value={wf.ffmc} max={101} color="bg-red-500" />
          <MetricBar label="DMC (Duff Moisture)" value={wf.dmc} max={200} color="bg-orange-500" />
          <MetricBar label="DC (Drought Code)" value={wf.dc} max={800} color="bg-amber-500" />
          <MetricBar label="ISI (Initial Spread Index)" value={wf.isi} max={50} color="bg-yellow-500" />
          <MetricBar label="BUI (Buildup Index)" value={wf.bui} max={300} color="bg-lime-500" />
        </div>
      </div>

      {/* Live Weather */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Thermometer size={12} />}
          label="Temperature"
          value={wf.temp.toFixed(1)}
          unit="°C"
          color="text-red-400"
        />
        <StatCard
          icon={<Droplets size={12} />}
          label="Humidity"
          value={wf.humidity.toFixed(0)}
          unit="%"
          color="text-cyan-400"
        />
        <StatCard
          icon={<Wind size={12} />}
          label="Wind Speed"
          value={wf.wind_speed.toFixed(1)}
          unit="km/h"
          color="text-blue-400"
        />
        <StatCard
          icon={<Navigation size={12} />}
          label="Wind Dir"
          value={`${wf.wind_direction}°`}
          color="text-indigo-400"
        />
      </div>
    </div>
  )
}

function DamageTab({ incident }: { incident: Incident | null }) {
  if (!incident?.impact) {
    return (
      <EmptyState
        icon={<AlertTriangle size={28} className="opacity-30" />}
        message="Damage assessment pending. Awaiting impact analysis..."
      />
    )
  }

  const imp = incident.impact

  return (
    <div className="space-y-4">
      {/* Total Damage Banner */}
      <div className="bg-gradient-to-br from-red-950 to-slate-800 rounded-xl p-4 border border-red-800">
        <p className="text-xs text-red-300 uppercase tracking-widest mb-1">Estimated Damage</p>
        <motion.div
          className="text-3xl font-black text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          NPR {(imp.dollar_damage / 1000).toFixed(0)}K
        </motion.div>
        {imp.area_burned_ha && (
          <p className="text-xs text-slate-400 mt-1">{imp.area_burned_ha.toFixed(1)} ha burned</p>
        )}
      </div>

      {/* Impact Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<TreePine size={12} />}
          label="Trees Lost"
          value={imp.trees_lost.toLocaleString()}
          color="text-green-400"
        />
        <StatCard
          icon={<Bird size={12} />}
          label="Wildlife"
          value={imp.wildlife_affected.toLocaleString()}
          color="text-amber-400"
        />
        <StatCard
          icon={<Factory size={12} />}
          label="CO₂ Tons"
          value={imp.co2_tons.toLocaleString()}
          color="text-slate-300"
        />
        <StatCard
          icon={<DollarSign size={12} />}
          label="Dollar Damage"
          value={`$${(imp.dollar_damage / 1_000_000).toFixed(2)}M`}
          color="text-red-400"
        />
      </div>

      {/* Severity bars */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Damage Severity</p>
        <div className="space-y-2.5">
          <MetricBar label="Vegetation Loss" value={imp.trees_lost} max={100000} color="bg-green-500" />
          <MetricBar label="Wildlife Impact" value={imp.wildlife_affected} max={20000} color="bg-amber-500" />
          <MetricBar label="CO₂ Emission" value={imp.co2_tons} max={200000} color="bg-slate-400" />
          <MetricBar label="Economic Loss" value={imp.dollar_damage} max={100_000_000} color="bg-red-500" />
        </div>
      </div>

      {imp.population_affected && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-center">
          <p className="text-xs text-red-400 uppercase tracking-widest">Population Affected</p>
          <p className="text-2xl font-black text-red-300 mt-1">
            {imp.population_affected.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

function SmokeDetectionTab({ incident }: { incident: Incident | null }) {
  if (!incident?.smoke) {
    return (
      <EmptyState
        icon={<Wind size={28} className="opacity-30" />}
        message="No smoke detection data available for this incident."
      />
    )
  }

  const smoke = incident.smoke
  const aqiColor = getAqiColor(smoke.aqi)
  const smokeColor = getSmokeColor(smoke.smoke_level)
  const aqiLabel = getAqiLabel(smoke.aqi)

  return (
    <div className="space-y-4">
      {/* AQI Gauge */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Air Quality Index</p>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 flex-shrink-0"
            style={{ borderColor: aqiColor, boxShadow: `0 0 20px ${aqiColor}40` }}
          >
            <span className="text-2xl font-black" style={{ color: aqiColor }}>
              {smoke.aqi}
            </span>
            <span className="text-xs text-slate-400">AQI</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: aqiColor }}>
              {aqiLabel}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Smoke:{' '}
              <span className={`font-bold ${smokeColor}`}>{smoke.smoke_level}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Visibility: {smoke.visibility_km.toFixed(1)} km
            </p>
          </div>
        </div>

        {/* AQI color scale */}
        <div className="mt-3">
          <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 via-red-500 to-purple-800" />
          <div className="flex justify-between text-xs text-slate-500 mt-0.5">
            <span>Good</span>
            <span>Moderate</span>
            <span>Unhealthy</span>
            <span>Hazardous</span>
          </div>
        </div>
      </div>

      {/* Plume Info */}
      <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Smoke Plume</p>
        <div className="flex items-center gap-6">
          {/* Compass rose */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <div className="w-full h-full rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center">
              <motion.div
                animate={{ rotate: smoke.plume_direction }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="w-1 h-6 bg-gradient-to-t from-transparent to-fire-orange rounded-full"
                style={{ transformOrigin: 'bottom center' }}
              />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-xs text-slate-400">N</div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Navigation size={12} className="text-fire-orange" />
              Direction: <strong>{smoke.plume_direction}°</strong>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Wind size={12} className="text-blue-400" />
              Speed: <strong>{smoke.plume_speed_kmh.toFixed(1)} km/h</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Pollutants */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<Eye size={12} />}
          label="Visibility"
          value={smoke.visibility_km.toFixed(1)}
          unit="km"
          color="text-cyan-400"
        />
        <StatCard
          icon={<Wind size={12} />}
          label="PM2.5"
          value={smoke.pm25.toFixed(0)}
          unit="μg"
          color="text-orange-400"
        />
        <StatCard
          icon={<Wind size={12} />}
          label="PM10"
          value={smoke.pm10.toFixed(0)}
          unit="μg"
          color="text-red-400"
        />
      </div>
    </div>
  )
}

// ─── Main ModulePanel ────────────────────────────────────────────────────────

const TABS: { id: ModuleTab; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { id: 'fire', label: 'Fire Detection', shortLabel: 'Fire', icon: <Flame size={16} /> },
  { id: 'risk', label: 'Risk Model', shortLabel: 'Risk', icon: <TrendingUp size={16} /> },
  { id: 'weather', label: 'Weather + Fire', shortLabel: 'Weather', icon: <Cloud size={16} /> },
  { id: 'damage', label: 'Damage', shortLabel: 'Damage', icon: <AlertTriangle size={16} /> },
  { id: 'smoke', label: 'Smoke Detection', shortLabel: 'Smoke', icon: <Wind size={16} /> },
]

export const ModulePanel: React.FC = () => {
  const activeModule = useIncidentStore((state) => state.activeModule)
  const setActiveModule = useIncidentStore((state) => state.setActiveModule)
  const selectedIncidentId = useIncidentStore((state) => state.selectedIncidentId)
  const getIncidentById = useIncidentStore((state) => state.getIncidentById)
  const incidents = useIncidentStore((state) => state.incidents)

  // Show selected incident or the most recently updated one
  const incident = selectedIncidentId
    ? getIncidentById(selectedIncidentId) || null
    : incidents[0] || null

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-fire-orange rounded-full animate-pulse" />
          AI Analysis Modules
        </h2>
        {incident && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Viewing: {incident.detection?.location_name || `INC-${incident.id.slice(4, 12).toUpperCase()}`}
          </p>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-700 bg-slate-800/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveModule(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-xs transition-all border-b-2 ${
              activeModule === tab.id
                ? 'border-fire-orange text-fire-orange bg-slate-700/50'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span className="text-[10px] leading-none">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeModule === 'fire' && <FireDetectionTab incident={incident} />}
            {activeModule === 'risk' && <RiskModelTab incident={incident} />}
            {activeModule === 'weather' && <WeatherFireTab incident={incident} />}
            {activeModule === 'damage' && <DamageTab incident={incident} />}
            {activeModule === 'smoke' && <SmokeDetectionTab incident={incident} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      {incident && (
        <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/50 text-xs text-slate-500">
          Updated: {new Date(incident.updated_at).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
