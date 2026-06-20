import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIncidentStore } from '../store'
import {
  Brain,
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { AIRecommendation } from '../types'

const PRIORITY_STYLES: Record<AIRecommendation['priority'], { badge: string; ring: string; icon: string }> = {
  CRITICAL: { badge: 'bg-red-500/20 text-red-300 border-red-500/50', ring: 'border-l-red-500', icon: '🚨' },
  HIGH: { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/50', ring: 'border-l-orange-500', icon: '⚠️' },
  MEDIUM: { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', ring: 'border-l-amber-500', icon: '📍' },
  LOW: { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/50', ring: 'border-l-blue-500', icon: 'ℹ️' },
}

function getRiskColor(score: number) {
  if (score >= 80) return { text: 'text-red-400', glow: 'shadow-red-500/40', label: 'CRITICAL' }
  if (score >= 60) return { text: 'text-orange-400', glow: 'shadow-orange-500/40', label: 'HIGH' }
  if (score >= 40) return { text: 'text-amber-400', glow: 'shadow-amber-500/40', label: 'MODERATE' }
  return { text: 'text-green-400', glow: 'shadow-green-500/40', label: 'LOW' }
}

export const AICommander: React.FC = () => {
  const incident = useIncidentStore((s) => s.getActiveIncident())

  if (!incident) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
        <Brain size={48} className="opacity-20" />
        <p className="text-sm">Awaiting incident data for AI analysis...</p>
      </div>
    )
  }

  const risk = incident.risk
  const recs = incident.ai_recommendations ?? []
  const score = risk?.score ?? 0
  const riskMeta = getRiskColor(score)
  const topFactors = Object.entries(risk?.feature_importance ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, val]) => ({ key: key.replace(/_/g, ' '), val: Math.round(val * 100) }))

  const weather = risk?.weather_data

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1 scrollbar-thin">
      {/* AI Status Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/50 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Brain size={20} className="text-purple-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-purple-200">AI Fire Commander</h2>
            <p className="text-xs text-purple-400">Real-time incident intelligence</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-green-900/40 border border-green-700/50 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300">LIVE AI</span>
          </div>
        </div>

        {/* Situation Summary */}
        <div className="bg-slate-900/60 rounded-lg p-3 text-xs space-y-1.5">
          <p className="text-slate-300 font-medium">Current Situation</p>
          <p className="text-slate-400">
            🔥 Active fire at <span className="text-slate-200 font-semibold">{incident.detection?.location_name ?? 'Unknown Location'}</span>
          </p>
          {weather && (
            <>
              <p className="text-slate-400">
                💨 Wind: <span className="text-slate-200">{weather.wind_speed.toFixed(0)} km/h</span>
                {' · '}💧 Humidity: <span className="text-slate-200">{weather.humidity.toFixed(0)}%</span>
                {' · '}🌡️ Temp: <span className="text-slate-200">{weather.temperature.toFixed(0)}°C</span>
              </p>
            </>
          )}
          <p className="text-slate-400">
            Status: <span className={`font-bold ${riskMeta.text}`}>{incident.status ?? 'ACTIVE'}</span>
            {' · '}Severity: <span className={`font-bold ${riskMeta.text}`}>{riskMeta.label}</span>
          </p>
        </div>
      </div>

      {/* Risk Score */}
      {risk && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={12} /> Risk Assessment
            </p>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              score >= 80 ? 'bg-red-900/40 border-red-700/50 text-red-300' :
              score >= 60 ? 'bg-orange-900/40 border-orange-700/50 text-orange-300' :
              'bg-amber-900/40 border-amber-700/50 text-amber-300'
            }`}>{riskMeta.label}</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className={`text-5xl font-black ${riskMeta.text}`}>{Math.round(score)}</div>
            <div className="flex-1">
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-orange-500' : 'bg-amber-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Risk Score / 100</p>
            </div>
          </div>

          {/* Risk Factors */}
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Why this risk level?</p>
          <div className="space-y-2">
            {topFactors.map(({ key, val }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-300 capitalize">{key}</span>
                  <span className="text-slate-400 font-mono">+{val}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Target size={12} /> AI Recommended Actions
        </p>
        <div className="space-y-2">
          <AnimatePresence>
            {recs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Awaiting data for recommendations...</p>
            ) : (
              recs.map((rec, i) => {
                const style = PRIORITY_STYLES[rec.priority]
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`border-l-2 ${style.ring} bg-slate-900/60 rounded-r-lg p-3`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0 mt-0.5">{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
                            {rec.priority}
                          </span>
                          {rec.zone && (
                            <span className="text-[10px] text-slate-500">{rec.zone}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 font-medium">{rec.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{rec.reason}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Priority Alerts */}
      {recs.filter(r => r.priority === 'CRITICAL').length > 0 && (
        <motion.div
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="bg-red-950/60 border border-red-700/60 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-xs font-bold text-red-300 uppercase tracking-widest">Priority Alerts</p>
          </div>
          {recs.filter(r => r.priority === 'CRITICAL').map((rec, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-red-200 mt-1">
              <ChevronRight size={12} className="text-red-400 flex-shrink-0" />
              {rec.action}
            </div>
          ))}
        </motion.div>
      )}

      {/* No Data Placeholder */}
      {!risk && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 text-center">
          <Clock size={28} className="text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Risk model is calculating. Connect to live backend or run mock WebSocket server.</p>
        </div>
      )}
    </div>
  )
}
