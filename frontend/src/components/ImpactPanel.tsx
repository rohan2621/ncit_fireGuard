import React from 'react'
import { motion } from 'framer-motion'
import { useIncidentStore } from '../store'
import { Building2, Users, Car, Zap, AlertTriangle, TreePine, DollarSign } from 'lucide-react'

interface ImpactMetric {
  icon: React.ReactNode
  label: string
  value: string
  color: string
  subtext?: string
}

export const ImpactPanel: React.FC = () => {
  const incident = useIncidentStore((s) => s.getActiveIncident())
  const impact = incident?.impact

  const metrics: ImpactMetric[] = impact ? [
    {
      icon: <Building2 size={16} />,
      label: 'Buildings Threatened',
      value: (impact.buildings_threatened ?? impact.structures_threatened ?? 0).toLocaleString(),
      color: 'text-red-300',
      subtext: 'Structures in danger zone',
    },
    {
      icon: <Users size={16} />,
      label: 'Population Affected',
      value: (impact.population_affected ?? 0).toLocaleString(),
      color: 'text-orange-300',
      subtext: 'People in evacuation zone',
    },
    {
      icon: <Car size={16} />,
      label: 'Roads at Risk',
      value: (impact.roads_affected ?? 3).toString(),
      color: 'text-amber-300',
      subtext: 'Access routes threatened',
    },
    {
      icon: <Zap size={16} />,
      label: 'Critical Infrastructure',
      value: (impact.critical_infrastructure?.length ?? 2).toString(),
      color: 'text-yellow-300',
      subtext: 'Power, water, comms',
    },
    {
      icon: <TreePine size={16} />,
      label: 'Trees Lost',
      value: impact.trees_lost.toLocaleString(),
      color: 'text-green-400',
      subtext: `${(impact.area_burned_ha ?? 0).toFixed(1)} ha burned`,
    },
    {
      icon: <DollarSign size={16} />,
      label: 'Economic Damage',
      value: `NPR ${(impact.dollar_damage / 1_000_000).toFixed(1)}M`,
      color: 'text-slate-300',
      subtext: 'Estimated total loss',
    },
  ] : []

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-700/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
            <AlertTriangle size={20} className="text-red-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-red-200">Impact Analysis</h2>
            <p className="text-xs text-red-400">Real-time damage assessment</p>
          </div>
        </div>
      </div>

      {!impact ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
          <AlertTriangle size={36} className="opacity-20" />
          <p className="text-sm text-center">Impact assessment pending. Awaiting data from incident system.</p>
        </div>
      ) : (
        <>
          {/* Total Damage Banner */}
          <div className="bg-gradient-to-br from-red-950 to-slate-900 border border-red-800/60 rounded-xl p-4 text-center">
            <p className="text-xs text-red-400 uppercase tracking-widest mb-1">Estimated Total Damage</p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 150 }}
              className="text-4xl font-black text-red-300"
            >
              NPR {(impact.dollar_damage / 1_000_000).toFixed(2)}M
            </motion.div>
            {impact.area_burned_ha && (
              <p className="text-xs text-slate-500 mt-1">{impact.area_burned_ha.toFixed(1)} hectares burned</p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-3"
              >
                <div className={`flex items-center gap-1.5 mb-1 ${m.color}`}>
                  {m.icon}
                  <span className="text-[10px] text-slate-400">{m.label}</span>
                </div>
                <div className={`text-xl font-black ${m.color}`}>{m.value}</div>
                {m.subtext && <p className="text-[10px] text-slate-600 mt-0.5">{m.subtext}</p>}
              </motion.div>
            ))}
          </div>

          {/* Severity Bars */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Damage Severity</p>
            {[
              { label: 'Vegetation Loss', value: impact.trees_lost, max: 100_000, color: 'bg-green-500' },
              { label: 'Wildlife Impact', value: impact.wildlife_affected, max: 20_000, color: 'bg-amber-500' },
              { label: 'CO₂ Emissions', value: impact.co2_tons, max: 200_000, color: 'bg-slate-400' },
              { label: 'Economic Loss', value: impact.dollar_damage, max: 100_000_000, color: 'bg-red-500' },
            ].map(({ label, value, max, color }) => {
              const pct = Math.min(100, (value / max) * 100)
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-300 font-mono">{value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <motion.div
                      className={`h-full rounded-full ${color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
