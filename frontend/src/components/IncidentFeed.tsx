import React from 'react'
import { useIncidentStore } from '../store'
import { motion } from 'framer-motion'
import { Flame, TrendingUp } from 'lucide-react'

export const IncidentFeed: React.FC = () => {
  const incidents = useIncidentStore((state) => state.incidents)
  const selectedIncidentId = useIncidentStore((state) => state.selectedIncidentId)
  const selectIncident = useIncidentStore((state) => state.selectIncident)

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-500'
    if (score >= 60) return 'bg-orange-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-yellow-500'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'CRITICAL'
    if (score >= 60) return 'HIGH'
    if (score >= 40) return 'MEDIUM'
    return 'LOW'
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Flame size={18} className="text-fire-orange" /> Live Incident Feed
        </h2>
      </div>

      {/* Incidents List */}
      <div className="flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <Flame size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for incident detections...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {incidents.map((incident, idx) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => selectIncident(incident.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedIncidentId === incident.id
                    ? 'bg-slate-700 border-fire-orange shadow-lg shadow-fire-orange/20'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Risk Badge */}
                  {incident.risk && (
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getRiskColor(
                        incident.risk.score
                      )} text-white font-bold text-xs`}
                    >
                      {Math.round(incident.risk.score)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        Incident {incident.id.slice(0, 8).toUpperCase()}
                      </p>
                      {incident.risk && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                            incident.risk.score >= 80
                              ? 'bg-red-900 text-red-200'
                              : incident.risk.score >= 60
                              ? 'bg-orange-900 text-orange-200'
                              : 'bg-yellow-900 text-yellow-200'
                          }`}
                        >
                          {getRiskLabel(incident.risk.score)}
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    {incident.detection && (
                      <p className="text-xs text-slate-400 mb-1">
                        📍 {incident.detection.lat.toFixed(4)},
                        {incident.detection.lng.toFixed(4)}
                      </p>
                    )}

                    {/* Confidence */}
                    {incident.detection && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-fire-orange to-fire-red h-full rounded-full"
                            style={{
                              width: `${incident.detection.confidence * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-400">
                          {(incident.detection.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {/* Status Indicators */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {incident.risk && (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} /> Risk
                        </span>
                      )}
                      {incident.simulation && incident.simulation.length > 0 && (
                        <span>📡 Simulation</span>
                      )}
                      {incident.impact && <span>💔 Impact Data</span>}
                      {incident.report && <span>📄 Report</span>}
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(incident.updated_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Simple date-fns replacement if needed
function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + 'y' + (options?.addSuffix ? ' ago' : '')
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + 'mo' + (options?.addSuffix ? ' ago' : '')
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + 'd' + (options?.addSuffix ? ' ago' : '')
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + 'h' + (options?.addSuffix ? ' ago' : '')
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + 'm' + (options?.addSuffix ? ' ago' : '')
  return Math.floor(seconds) + 's' + (options?.addSuffix ? ' ago' : '')
}
