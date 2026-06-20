import React from 'react'
import { motion } from 'framer-motion'
import { useIncidentStore } from '../store'
import { Truck, Users, Plane, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'

const STATUS_STYLES = {
  DEPLOYED: { badge: 'bg-red-900/40 border-red-700/50 text-red-300', dot: 'bg-red-400', label: 'DEPLOYED' },
  STAGING: { badge: 'bg-amber-900/40 border-amber-700/50 text-amber-300', dot: 'bg-amber-400 animate-pulse', label: 'STAGING' },
  AVAILABLE: { badge: 'bg-green-900/40 border-green-700/50 text-green-300', dot: 'bg-green-400', label: 'AVAILABLE' },
}

const AVAILABLE_RESOURCES = { fire_trucks: 12, personnel: 96, aircraft: 6 }

export const ResourcePanel: React.FC = () => {
  const incident = useIncidentStore((s) => s.getActiveIncident())
  const resources = incident?.resources ?? []

  const deployed = resources.reduce(
    (acc, r) => ({ trucks: acc.trucks + r.fire_trucks, personnel: acc.personnel + r.personnel, aircraft: acc.aircraft + r.aircraft }),
    { trucks: 0, personnel: 0, aircraft: 0 }
  )

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-violet-900/40 border border-purple-700/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Truck size={20} className="text-purple-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-purple-200">Resource Optimization</h2>
            <p className="text-xs text-purple-400">AI-assisted resource allocation</p>
          </div>
        </div>
      </div>

      {/* Fleet Overview */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Fleet Status</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Truck size={16} className="text-red-400" />, label: 'Fire Trucks', deployed: deployed.trucks, total: AVAILABLE_RESOURCES.fire_trucks },
            { icon: <Users size={16} className="text-blue-400" />, label: 'Personnel', deployed: deployed.personnel, total: AVAILABLE_RESOURCES.personnel },
            { icon: <Plane size={16} className="text-amber-400" />, label: 'Aircraft', deployed: deployed.aircraft, total: AVAILABLE_RESOURCES.aircraft },
          ].map(({ icon, label, deployed: dep, total }) => {
            const pct = total > 0 ? (dep / total) * 100 : 0
            return (
              <div key={label} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">{icon}<span className="text-xs text-slate-400">{label}</span></div>
                <div className="text-xl font-black text-slate-100">{dep}<span className="text-sm text-slate-500 font-normal">/{total}</span></div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                  <motion.div
                    className={`h-full rounded-full ${pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="text-[10px] text-slate-600 mt-0.5">{pct.toFixed(0)}% deployed</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Zone Allocations */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">🗺️ Zone Allocations</p>
        {resources.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">Awaiting AI resource allocation...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map((zone, i) => {
              const style = STATUS_STYLES[zone.status]
              return (
                <motion.div
                  key={zone.zone}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-200">{zone.zone}</span>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />{style.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-black text-red-300">{zone.fire_trucks}</div>
                      <div className="text-[10px] text-slate-500">Trucks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-blue-300">{zone.personnel}</div>
                      <div className="text-[10px] text-slate-500">Personnel</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-amber-300">{zone.aircraft}</div>
                      <div className="text-[10px] text-slate-500">Aircraft</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Recommendation note */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            Resource allocation is automatically optimized by AI based on fire risk score, spread direction, and zone threat level.
          </p>
        </div>
      </div>
    </div>
  )
}
