import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIncidentStore } from '../store'
import { TimelineEvent } from '../types'
import { Clock, Flame, TrendingUp, Radio, AlertTriangle, FileText, Wind, Cloud } from 'lucide-react'

// Inline SVG components to avoid name conflicts
function ShieldIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function TerminalIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  )
}
function SatelliteIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M6.343 17.657 3.515 20.485M3.515 3.515l2.828 2.828M20.485 20.485l-2.828-2.828M17.657 6.343l2.828-2.828"/>
      <path d="M2 12h2M20 12h2M12 2v2M12 20v2"/>
    </svg>
  )
}

const EVENT_ICONS: Record<TimelineEvent['type'], React.ReactNode> = {
  detection: <Flame size={14} className="text-red-400" />,
  risk_update: <TrendingUp size={14} className="text-orange-400" />,
  simulation: <Radio size={14} className="text-blue-400" />,
  impact: <AlertTriangle size={14} className="text-red-400" />,
  report: <FileText size={14} className="text-green-400" />,
  resource: <ShieldIcon size={14} className="text-purple-400" />,
  command: <TerminalIcon size={14} className="text-cyan-400" />,
  satellite: <SatelliteIcon size={14} className="text-amber-400" />,
  smoke: <Wind size={14} className="text-slate-400" />,
  weather: <Cloud size={14} className="text-sky-400" />,
}

const SEVERITY_STYLES: Record<NonNullable<TimelineEvent['severity']>, string> = {
  critical: 'border-red-500/50 bg-red-900/20',
  warning: 'border-amber-500/50 bg-amber-900/20',
  info: 'border-slate-600/50 bg-slate-800/40',
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

export const Timeline: React.FC = () => {
  const incident = useIncidentStore((s) => s.getActiveIncident())
  const events = [...(incident?.timeline ?? [])].reverse()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900/40 to-teal-900/40 border border-green-700/50 rounded-xl p-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
            <Clock size={20} className="text-green-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-green-200">Incident Timeline</h2>
            <p className="text-xs text-green-400">{events.length} events recorded</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Clock size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No events yet. Connect to live backend or mock WebSocket server.</p>
              <p className="text-xs text-slate-600 mt-1">Events are recorded automatically from all incident data streams.</p>
            </div>
          ) : (
            events.map((event, i) => {
              const icon = EVENT_ICONS[event.type] ?? <Clock size={14} />
              const sev = event.severity ?? 'info'
              const style = SEVERITY_STYLES[sev]

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i < 5 ? i * 0.04 : 0 }}
                  className={`border rounded-xl p-3 ${style}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 p-1 bg-slate-900/60 rounded-md">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-slate-200 truncate">{event.title}</p>
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
