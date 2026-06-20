import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIncidentStore } from '../store'
import {
  Play,
  Wind,
  Droplets,
  Thermometer,
  Mountain,
  CloudRain,
  Compass,
  Zap,
  AlertTriangle,
  Timer,
  RefreshCw,
} from 'lucide-react'

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const DURATION_OPTIONS: Array<1 | 6 | 12 | 24> = [1, 6, 12, 24]

const SCENARIOS = [
  { label: 'Extreme Wind', icon: '🌪️', params: { wind_speed: 90, wind_direction: 'NE', humidity: 15, temperature: 38, fuel_dryness: 4, rainfall: 0 } },
  { label: 'Humidity Drop', icon: '🏜️', params: { wind_speed: 30, humidity: 5, temperature: 42, fuel_dryness: 4, rainfall: 0 } },
  { label: 'Heavy Rain', icon: '🌧️', params: { wind_speed: 10, humidity: 90, temperature: 18, fuel_dryness: 1, rainfall: 40 } },
  { label: 'Night Conditions', icon: '🌙', params: { wind_speed: 15, humidity: 60, temperature: 12, fuel_dryness: 2, rainfall: 0 } },
]

const THREAT_COLORS: Record<string, string> = {
  EXTREME: 'text-red-400 border-red-500/50 bg-red-900/30',
  VERY_HIGH: 'text-orange-400 border-orange-500/50 bg-orange-900/30',
  HIGH: 'text-amber-400 border-amber-500/50 bg-amber-900/30',
  MODERATE: 'text-yellow-400 border-yellow-500/50 bg-yellow-900/30',
  LOW: 'text-green-400 border-green-500/50 bg-green-900/30',
}

function SliderControl({
  label, icon, value, min, max, step = 1, unit,
  onChange,
}: {
  label: string; icon: React.ReactNode; value: number; min: number; max: number;
  step?: number; unit: string; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">{icon} {label}</div>
        <span className="text-xs font-mono font-bold text-slate-200">{value}{unit}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
          style={{
            background: `linear-gradient(to right, #f97316 0%, #f97316 ${pct}%, #334155 ${pct}%, #334155 100%)`
          }}
        />
      </div>
    </div>
  )
}

export const SimulationInterface: React.FC = () => {
  const simParams = useIncidentStore((s) => s.simParams)
  const simResult = useIncidentStore((s) => s.simResult)
  const isSimRunning = useIncidentStore((s) => s.isSimRunning)
  const setSimParams = useIncidentStore((s) => s.setSimParams)
  const runSimulation = useIncidentStore((s) => s.runSimulation)
  const incident = useIncidentStore((s) => s.getActiveIncident())
  const [showResult, setShowResult] = useState(false)

  const handleRun = () => {
    setShowResult(false)
    runSimulation()
    setTimeout(() => setShowResult(true), 1900)
  }

  const threatStyle = simResult ? (THREAT_COLORS[simResult.threat_level] ?? THREAT_COLORS.MODERATE) : ''

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-700/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Zap size={20} className="text-blue-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-blue-200">Digital Twin Simulation</h2>
            <p className="text-xs text-blue-400">Adjust parameters and predict fire behavior</p>
          </div>
          {isSimRunning && (
            <div className="ml-auto flex items-center gap-2 text-xs text-cyan-300">
              <RefreshCw size={12} className="animate-spin" /> Running...
            </div>
          )}
        </div>
      </div>

      {/* What-If Scenarios */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">⚡ Quick Scenarios</p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.label}
              onClick={() => setSimParams(scenario.params as any)}
              className="flex items-center gap-2 bg-slate-900/60 hover:bg-slate-700/60 border border-slate-600 hover:border-slate-500 rounded-lg px-3 py-2 text-xs text-slate-300 transition-all"
            >
              <span className="text-base">{scenario.icon}</span>
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-4">
        <p className="text-xs text-slate-400 uppercase tracking-widest">🎛️ Simulation Parameters</p>

        <SliderControl label="Wind Speed" icon={<Wind size={12} />} value={simParams.wind_speed} min={0} max={100} unit=" km/h" onChange={(v) => setSimParams({ wind_speed: v })} />

        {/* Wind Direction */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Compass size={12} /> Wind Direction
          </div>
          <div className="flex flex-wrap gap-1">
            {WIND_DIRECTIONS.map((dir) => (
              <button
                key={dir}
                onClick={() => setSimParams({ wind_direction: dir })}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  simParams.wind_direction === dir
                    ? 'bg-fire-orange text-slate-900 shadow-md'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        <SliderControl label="Humidity" icon={<Droplets size={12} />} value={simParams.humidity} min={0} max={100} unit="%" onChange={(v) => setSimParams({ humidity: v })} />
        <SliderControl label="Temperature" icon={<Thermometer size={12} />} value={simParams.temperature} min={0} max={50} unit="°C" onChange={(v) => setSimParams({ temperature: v })} />

        {/* Fuel Dryness */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">🌾 Fuel Dryness</div>
            <span className="text-xs font-mono text-slate-200">
              {['Very Low', 'Low', 'Moderate', 'High', 'Extreme'][simParams.fuel_dryness]}
            </span>
          </div>
          <input type="range" min={0} max={4} step={1} value={simParams.fuel_dryness}
            onChange={(e) => setSimParams({ fuel_dryness: Number(e.target.value) })}
            className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
            style={{ background: `linear-gradient(to right, #22c55e 0%, #f97316 ${(simParams.fuel_dryness/4)*100}%, #334155 ${(simParams.fuel_dryness/4)*100}%, #334155 100%)` }}
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>Very Low</span><span>Extreme</span>
          </div>
        </div>

        <SliderControl label="Terrain Slope" icon={<Mountain size={12} />} value={simParams.terrain_slope} min={0} max={45} unit="°" onChange={(v) => setSimParams({ terrain_slope: v })} />
        <SliderControl label="Rainfall" icon={<CloudRain size={12} />} value={simParams.rainfall} min={0} max={50} unit=" mm" onChange={(v) => setSimParams({ rainfall: v })} />
      </div>

      {/* Duration */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Timer size={12} /> Prediction Horizon
        </div>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setSimParams({ duration_hours: d })}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                simParams.duration_hours === d
                  ? 'bg-fire-orange text-slate-900'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {d}h
            </button>
          ))}
        </div>
      </div>

      {/* Run Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleRun}
        disabled={isSimRunning}
        className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
          isSimRunning
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-fire-orange to-red-500 text-white shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02]'
        }`}
      >
        {isSimRunning ? (
          <><RefreshCw size={16} className="animate-spin" /> Running Simulation...</>
        ) : (
          <><Play size={16} /> Run Simulation</>
        )}
      </motion.button>

      {/* Before / After Comparison */}
      {incident?.detection && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Current State</p>
            <div className="text-2xl font-black text-slate-200">
              {incident.detection.area_ha?.toFixed(0) ?? '—'}
            </div>
            <p className="text-xs text-slate-500">hectares</p>
          </div>
          <div className={`border rounded-xl p-3 text-center transition-all ${simResult ? 'bg-red-900/20 border-red-700/50' : 'bg-slate-800/60 border-slate-700'}`}>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Predicted ({simParams.duration_hours}h)</p>
            <div className={`text-2xl font-black ${simResult ? 'text-red-300' : 'text-slate-500'}`}>
              {simResult ? simResult.predicted_area_ha.toLocaleString() : '—'}
            </div>
            <p className="text-xs text-slate-500">hectares</p>
          </div>
        </div>
      )}

      {/* Simulation Output */}
      <AnimatePresence>
        {showResult && simResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 uppercase tracking-widest">📊 Simulation Output</p>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${threatStyle}`}>
                {simResult.threat_level}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Predicted Growth', value: `+${simResult.area_growth_pct}%`, color: 'text-red-300' },
                { label: 'Estimated Reach', value: `${simResult.predicted_spread_km} km`, color: 'text-orange-300' },
                { label: 'Threat Level', value: simResult.threat_level, color: 'text-amber-300' },
                { label: 'Time Horizon', value: `${simResult.eta_hours}h`, color: 'text-blue-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-900/60 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {simResult.affected_zones.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 mb-1.5">Affected Zones</p>
                {simResult.affected_zones.map((zone) => (
                  <div key={zone} className="flex items-center gap-1.5 text-xs text-orange-300">
                    <AlertTriangle size={10} /> {zone}
                  </div>
                ))}
              </div>
            )}

            {/* Fire Spread Visualization */}
            <div className="relative h-28 bg-slate-900/80 rounded-lg overflow-hidden border border-slate-700">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Background grid */}
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: 'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />
                {/* Safe zone */}
                <div className="absolute w-full h-full bg-green-900/10" />
                {/* Predicted spread */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute rounded-full opacity-30"
                  style={{
                    width: `${Math.min(90, simResult.predicted_spread_km * 6)}%`,
                    paddingBottom: `${Math.min(90, simResult.predicted_spread_km * 6)}%`,
                    background: 'radial-gradient(circle, #fbbf24 0%, #f97316 40%, transparent 70%)',
                  }}
                />
                {/* Current fire */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute rounded-full bg-red-500/60"
                  style={{ width: '18%', paddingBottom: '18%' }}
                />
                {/* Labels */}
                <div className="absolute bottom-1 right-2 text-[10px] text-orange-400">Predicted spread →</div>
                <div className="absolute bottom-1 left-2 text-[10px] text-red-400">● Active fire</div>
                {/* Wind arrow */}
                <div className="absolute top-2 right-2 text-[10px] text-blue-400">
                  💨 {simParams.wind_direction} {simParams.wind_speed}km/h
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
