import React from 'react'
import { useIncidentStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, AlertTriangle, FileText, Loader } from 'lucide-react'

export const IncidentDetailPanel: React.FC = () => {
  const selectedIncidentId = useIncidentStore(
    (state) => state.selectedIncidentId
  )
  const selectIncident = useIncidentStore((state) => state.selectIncident)
  const getIncidentById = useIncidentStore((state) => state.getIncidentById)

  if (!selectedIncidentId) {
    return null
  }

  const incident = getIncidentById(selectedIncidentId)
  if (!incident) return null

  const riskScore = incident.risk?.score || 0
  const topFeatures = incident.risk?.feature_importance
    ? Object.entries(incident.risk.feature_importance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : []

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        className="absolute right-4 top-4 bottom-4 z-40 w-96 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">
            Incident {selectedIncidentId.slice(0, 8).toUpperCase()}
          </h2>
          <button
            onClick={() => selectIncident(null)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Location */}
          {incident.detection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-700 rounded-lg p-3"
            >
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                📍 Location
              </p>
              <p className="font-mono text-sm text-slate-100">
                {incident.detection.lat.toFixed(6)}, {incident.detection.lng.toFixed(6)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Confidence: {(incident.detection.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Detected: {new Date(incident.detection.timestamp).toLocaleString()}
              </p>
            </motion.div>
          )}

          {/* Risk Score */}
          {incident.risk && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-700 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp size={14} /> Risk Score
                </p>
                <div
                  className={`text-2xl font-bold ${
                    riskScore >= 80
                      ? 'text-red-400'
                      : riskScore >= 60
                      ? 'text-orange-400'
                      : riskScore >= 40
                      ? 'text-amber-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {Math.round(riskScore)}
                </div>
              </div>

              {/* Risk Bar */}
              <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden mb-3">
                <motion.div
                  className={`h-full rounded-full ${
                    riskScore >= 80
                      ? 'bg-red-500'
                      : riskScore >= 60
                      ? 'bg-orange-500'
                      : riskScore >= 40
                      ? 'bg-amber-500'
                      : 'bg-yellow-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${riskScore}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>

              {/* Weather Data */}
              {incident.risk.weather_data && (
                <div className="text-xs text-slate-300 space-y-1">
                  <p>
                    🌡️ Temp: {incident.risk.weather_data.temperature}°C
                  </p>
                  <p>
                    💨 Wind: {incident.risk.weather_data.wind_speed} km/h
                  </p>
                  <p>
                    💧 Humidity: {incident.risk.weather_data.humidity}%
                  </p>
                </div>
              )}

              {/* Feature Importance */}
              {topFeatures.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
                    Top Risk Factors
                  </p>
                  <div className="space-y-2">
                    {topFeatures.map(([feature, importance]) => (
                      <div key={feature}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-300 capitalize">
                            {feature.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-400">
                            {(importance * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-1.5">
                          <div
                            className="bg-fire-orange h-full rounded-full"
                            style={{ width: `${importance * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Impact Data */}
          {incident.impact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-700 rounded-lg p-3"
            >
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                <AlertTriangle size={14} /> Impact Assessment
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-600 rounded p-2">
                  <p className="text-xs text-slate-400">Trees Lost</p>
                  <p className="text-xl font-bold text-slate-100">
                    {incident.impact.trees_lost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-600 rounded p-2">
                  <p className="text-xs text-slate-400">Wildlife</p>
                  <p className="text-xl font-bold text-slate-100">
                    {incident.impact.wildlife_affected.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-600 rounded p-2">
                  <p className="text-xs text-slate-400">CO₂ Tons</p>
                  <p className="text-xl font-bold text-slate-100">
                    {incident.impact.co2_tons.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-600 rounded p-2">
                  <p className="text-xs text-slate-400">Damage ($)</p>
                  <p className="text-xl font-bold text-fire-orange">
                    ${(incident.impact.dollar_damage / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Report */}
          {incident.report && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-700 rounded-lg p-3"
            >
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FileText size={14} /> Generated Report
              </p>
              <div className="bg-slate-600 rounded p-2 max-h-40 overflow-y-auto text-xs text-slate-300 leading-relaxed">
                {incident.report.content}
              </div>
            </motion.div>
          )}

          {/* Loading States */}
          {!incident.risk && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-700 rounded-lg p-3 flex items-center gap-2 text-slate-400"
            >
              <Loader size={16} className="animate-spin" />
              <p className="text-xs">Calculating risk assessment...</p>
            </motion.div>
          )}

          {!incident.impact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-700 rounded-lg p-3 flex items-center gap-2 text-slate-400"
            >
              <Loader size={16} className="animate-spin" />
              <p className="text-xs">Assessing environmental impact...</p>
            </motion.div>
          )}

          {!incident.report && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-700 rounded-lg p-3 flex items-center gap-2 text-slate-400"
            >
              <Loader size={16} className="animate-spin" />
              <p className="text-xs">Generating report...</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-900 text-xs text-slate-400">
          Last updated: {new Date(incident.updated_at).toLocaleTimeString()}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
