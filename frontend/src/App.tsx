import React, { useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import {
  Map,
  AlertSystem,
  AICommander,
  SimulationInterface,
  Timeline,
  ResourcePanel,
  ImpactPanel,
  FireMemory,
  CommandBar,
  ReportGenerator,
  IncidentFeed,
  ModulePanel,
} from './components'
import { useIncidentStore, DashboardView } from './store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  WifiOff,
  Wifi,
  Brain,
  Zap,
  Clock,
  Truck,
  AlertTriangle,
  History,
  Terminal,
  FileText,
  Map as MapIcon,
  MapPin,
} from 'lucide-react'

interface NavItem {
  id: DashboardView
  label: string
  shortLabel: string
  icon: React.ReactNode
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'command', label: 'AI Commander', shortLabel: 'AI', icon: <Brain size={15} />, color: 'text-purple-400' },
  { id: 'map', label: 'Map View', shortLabel: 'Map', icon: <MapIcon size={15} />, color: 'text-blue-400' },
  { id: 'simulation', label: 'Simulation', shortLabel: 'Sim', icon: <Zap size={15} />, color: 'text-cyan-400' },
  { id: 'timeline', label: 'Timeline', shortLabel: 'Log', icon: <Clock size={15} />, color: 'text-green-400' },
  { id: 'resources', label: 'Resources', shortLabel: 'Res', icon: <Truck size={15} />, color: 'text-purple-400' },
  { id: 'impact', label: 'Impact', shortLabel: 'Imp', icon: <AlertTriangle size={15} />, color: 'text-red-400' },
  { id: 'memory', label: 'Fire Memory', shortLabel: 'Hist', icon: <History size={15} />, color: 'text-amber-400' },
]

function getSeverityStyle(severity?: string) {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500 text-white animate-pulse'
    case 'HIGH': return 'bg-orange-500 text-white'
    case 'MODERATE': return 'bg-amber-500 text-slate-900'
    default: return 'bg-slate-600 text-slate-200'
  }
}

function ViewContent({ view }: { view: DashboardView }) {
  switch (view) {
    case 'command': return <AICommander />
    case 'simulation': return <SimulationInterface />
    case 'timeline': return <Timeline />
    case 'resources': return <ResourcePanel />
    case 'impact': return <ImpactPanel />
    case 'memory': return <FireMemory />
    case 'map': return null // handled separately
    default: return null
  }
}

export default function App() {
  const wsConnected = useIncidentStore((s) => s.wsConnected)
  const incidents = useIncidentStore((s) => s.incidents)
  const activeView = useIncidentStore((s) => s.activeDashboardView)
  const setActiveView = useIncidentStore((s) => s.setActiveDashboardView)
  const activeIncident = useIncidentStore((s) => s.getActiveIncident())
  const [showCommandBar, setShowCommandBar] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useWebSocket()

  const isMapView = activeView === 'map'

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <motion.header
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex-shrink-0 h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/80 px-4 flex items-center justify-between shadow-2xl z-50"
      >
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-1.5 bg-gradient-to-br from-fire-orange to-fire-red rounded-lg shadow-lg shadow-orange-500/30">
              <Flame size={18} className="text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-base font-black bg-gradient-to-r from-fire-orange via-red-400 to-fire-red bg-clip-text text-transparent leading-none">
              FireGuard Nexus
            </h1>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">🇳🇵 AI Wildfire Command System</p>
          </div>
        </div>

        {/* Nav — center */}
        <div className="hidden md:flex items-center gap-0.5 bg-slate-800/70 rounded-xl p-1 border border-slate-700/50">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={item.label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeView === item.id
                  ? 'bg-fire-orange text-slate-900 shadow-md shadow-orange-500/20'
                  : `text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 ${item.color}`
              }`}
            >
              {item.icon}
              <span className="hidden lg:block">{item.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Right — status */}
        <div className="flex items-center gap-2">
          {/* Incident status */}
          {activeIncident && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-700">
                <MapPin size={11} className="text-red-400" />
                <span className="max-w-24 truncate">{activeIncident.detection?.location_name ?? 'Unknown'}</span>
              </div>
              {activeIncident.severity && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${getSeverityStyle(activeIncident.severity)}`}>
                  {activeIncident.severity}
                </span>
              )}
            </div>
          )}

          {/* Incidents counter */}
          {incidents.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-800/60 rounded-lg px-2.5 py-1.5">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
              <span className="text-xs font-bold text-red-300">{incidents.length} Active</span>
            </div>
          )}

          {/* Command bar toggle */}
          <button
            onClick={() => setShowCommandBar(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
              showCommandBar ? 'bg-cyan-900/60 border-cyan-700/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Terminal size={13} />
            <span className="hidden sm:block">Command</span>
          </button>

          {/* Report button */}
          <button
            onClick={() => setShowReport(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
              showReport ? 'bg-emerald-900/60 border-emerald-700/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <FileText size={13} />
            <span className="hidden sm:block">Report</span>
          </button>

          {/* WebSocket indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
            wsConnected
              ? 'bg-green-950/60 border-green-800/50 text-green-300'
              : 'bg-red-950/60 border-red-800/50 text-red-300'
          }`}>
            {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden sm:block">{wsConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </motion.header>

      {/* Mobile nav */}
      <div className="md:hidden flex-shrink-0 bg-slate-900/90 border-b border-slate-700/60 px-2 py-1.5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all flex-shrink-0 ${
                activeView === item.id ? 'bg-fire-orange text-slate-900' : 'text-slate-400 bg-slate-800'
              }`}>
              {item.icon}{item.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden relative">
        {isMapView ? (
          /* Full-screen Map View */
          <div className="w-full h-full p-3">
            <div className="w-full h-full grid grid-cols-[280px_1fr_300px] gap-3">
              <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-0 overflow-hidden">
                <IncidentFeed />
              </motion.div>
              <div className="min-h-0 overflow-hidden">
                <Map />
              </div>
              <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-0 overflow-hidden">
                <ModulePanel />
              </motion.div>
            </div>
          </div>
        ) : (
          /* Command Center View — 3 columns */
          <div className="w-full h-full p-3 grid grid-cols-[260px_1fr_280px] gap-3">
            {/* Left: Incident Feed */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="min-h-0 overflow-hidden"
            >
              <IncidentFeed />
            </motion.div>

            {/* Center: Main Panel */}
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="min-h-0 overflow-hidden bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-xl flex flex-col"
            >
              {/* Panel header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/60 flex items-center gap-2 bg-slate-800/60">
                {NAV_ITEMS.find(n => n.id === activeView)?.icon}
                <span className="text-sm font-bold text-slate-200">
                  {NAV_ITEMS.find(n => n.id === activeView)?.label}
                </span>
                {activeIncident && (
                  <span className="ml-auto text-xs text-slate-500 truncate max-w-40">
                    {activeIncident.id}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <ViewContent view={activeView} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Right: Command / Report / Module panels */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="min-h-0 overflow-hidden flex flex-col gap-3"
            >
              <AnimatePresence mode="popLayout">
                {showCommandBar && (
                  <motion.div
                    key="commandbar"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: '50%', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-900/80 border border-cyan-700/40 rounded-xl flex flex-col"
                  >
                    <div className="flex-shrink-0 px-3 py-2 border-b border-slate-700/60 bg-slate-800/60 flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5"><Terminal size={12} /> AI Command</span>
                      <button onClick={() => setShowCommandBar(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                    </div>
                    <div className="flex-1 overflow-hidden p-3">
                      <CommandBar />
                    </div>
                  </motion.div>
                )}
                {showReport && (
                  <motion.div
                    key="report"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: showCommandBar ? '50%' : '40%', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-900/80 border border-emerald-700/40 rounded-xl flex flex-col"
                  >
                    <div className="flex-shrink-0 px-3 py-2 border-b border-slate-700/60 bg-slate-800/60 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5"><FileText size={12} /> Report</span>
                      <button onClick={() => setShowReport(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                    </div>
                    <div className="flex-1 overflow-hidden p-3">
                      <ReportGenerator />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Module panel always shown */}
              <div className={`min-h-0 overflow-hidden ${showCommandBar || showReport ? 'flex-1' : 'h-full'}`}>
                <ModulePanel />
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Alert System — floating toasts */}
      <AlertSystem />
    </div>
  )
}
