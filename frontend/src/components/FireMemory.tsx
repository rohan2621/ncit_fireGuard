import React from 'react'
import { motion } from 'framer-motion'
import { useIncidentStore } from '../store'
import { History, MapPin, Calendar, TrendingUp } from 'lucide-react'

export const FireMemory: React.FC = () => {
  const incident = useIncidentStore((s) => s.getActiveIncident())
  const historical = incident?.historical_matches ?? []
  const topMatch = historical[0]

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-700/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
            <History size={20} className="text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-200">Fire Memory System</h2>
            <p className="text-xs text-amber-400">Historical intelligence matching</p>
          </div>
          {topMatch && (
            <div className="ml-auto flex items-center gap-1 bg-amber-900/40 border border-amber-700/50 px-2 py-1 rounded-full">
              <span className="text-xs text-amber-300 font-bold">{topMatch.similarity_pct}% match</span>
            </div>
          )}
        </div>
      </div>

      {/* Pattern Alert */}
      {topMatch && (
        <motion.div
          animate={{ opacity: [1, 0.85, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-amber-400" />
            <p className="text-xs font-bold text-amber-300">Similar Pattern Detected</p>
          </div>
          <p className="text-xs text-amber-400/80 mt-1">
            This incident matches historical fire at <span className="text-amber-300 font-semibold">{topMatch.location}</span> with {topMatch.similarity_pct}% similarity.
          </p>
        </motion.div>
      )}

      {/* Historical Fires */}
      <div className="space-y-3">
        {historical.map((fire, i) => (
          <motion.div
            key={fire.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  fire.similarity_pct >= 80 ? 'bg-red-400' :
                  fire.similarity_pct >= 60 ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <span className="text-xs font-bold text-slate-300">{fire.id}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {fire.similarity_pct}% similar
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5 text-xs text-slate-400">
                <MapPin size={10} className="text-slate-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{fire.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={10} className="flex-shrink-0" />
                {fire.date}
              </div>
            </div>

            <div className="mt-2 bg-slate-900/60 rounded-lg p-2.5 space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Conditions</p>
              <p className="text-xs text-slate-400">{fire.conditions}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Outcome</p>
              <p className="text-xs text-slate-300">{fire.outcome}</p>
            </div>

            {/* Similarity bar */}
            <div className="mt-2">
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <motion.div
                  className={`h-full rounded-full ${
                    fire.similarity_pct >= 80 ? 'bg-red-500' :
                    fire.similarity_pct >= 60 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${fire.similarity_pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {historical.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <History size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No historical matches found yet.</p>
        </div>
      )}
    </div>
  )
}
