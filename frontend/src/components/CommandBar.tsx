import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Send, Bot, User, Sparkles } from 'lucide-react'
import { useIncidentStore } from '../store'
import { Incident } from '../types'

function getResponse(query: string, incident: Incident | null): string {
  const q = query.toLowerCase()

  if (!incident) {
    return "No active incident right now. Upload a video, start webcam monitoring, or connect a stream to begin tracking a fire."
  }

  const risk = incident.risk
  const impact = incident.impact
  const detection = incident.detection
  const resources = incident.resources ?? []
  const weather = risk?.weather_data

  if (q.includes('village') || q.includes('community') || q.includes('settlement')) {
    if (!weather) return "Risk model hasn't run for this incident yet — no wind or weather data available to assess threat direction."
    const dirLabel = ['N','NE','E','SE','S','SW','W','NW'][Math.round((weather.wind_direction ?? 0) / 45) % 8]
    const pop = impact?.population_affected
    const structures = impact?.structures_threatened
    return `🔍 Current wind: ${weather.wind_speed.toFixed(0)} km/h from ${dirLabel}. Fire is spreading in that direction. ` +
      (pop != null ? `Estimated ${pop.toLocaleString()} people in the affected zone. ` : '') +
      (structures != null ? `${structures.toLocaleString()} structures threatened. ` : '') +
      `Risk score: ${risk?.score?.toFixed(0) ?? '—'}/100.`
  }

  if (q.includes('wind') && (q.includes('increase') || q.includes('what if') || q.includes('stronger'))) {
    if (!weather) return "No current wind data for this incident yet — run risk assessment first."
    const currentWind = weather.wind_speed
    const hypotheticalWind = 60
    const scaleFactor = hypotheticalWind / Math.max(currentWind, 1)
    const currentArea = impact?.area_burned_ha
    const estimate = currentArea != null
      ? `Current burned area: ${currentArea.toFixed(1)} ha at ${currentWind.toFixed(0)} km/h wind. ` +
        `At ${hypotheticalWind} km/h, spread rate would scale roughly ${scaleFactor.toFixed(1)}x based on current wind-to-spread ratio — ` +
        `estimate only, not a re-run of the simulation. Use the Simulation tab to model this precisely.`
      : `Current wind is ${currentWind.toFixed(0)} km/h. At ${hypotheticalWind} km/h, expect substantially faster spread — ` +
        `use the Simulation tab with adjusted wind parameters for a precise modeled estimate.`
    return `📊 ${estimate}`
  }

  if (q.includes('report') || q.includes('generate') || q.includes('summary')) {
    if (incident.report?.content) {
      return "📋 Report already generated for this incident — open the Report tab to view the full content."
    }
    return "📋 Report not yet generated for this incident. It's created automatically once risk, simulation, and impact assessment all complete."
  }

  if (q.includes('evacuate') || q.includes('evacuation') || q.includes('zone')) {
    if (!detection) return "No detection data yet for this incident."
    const score = risk?.score ?? 30
    const radiusKm = (2 + (score / 100) * 8)
    const pop = impact?.population_affected
    return `🚨 Evacuation radius at current risk score (${score.toFixed(0)}/100): ~${radiusKm.toFixed(1)} km from ` +
      `${detection.lat.toFixed(3)}°N, ${detection.lng.toFixed(3)}°E. ` +
      (pop != null ? `Estimated ${pop.toLocaleString()} people within the affected area. ` : '') +
      `See the Map tab's evacuation circle for the live boundary.`
  }

  if (q.includes('resource') || q.includes('truck') || q.includes('personnel') || q.includes('deploy')) {
    if (resources.length === 0) {
      return "🚒 Resource allocation hasn't been calculated yet — this populates once risk assessment completes."
    }
    const lines = resources.map(r =>
      `${r.zone}: ${r.fire_trucks} trucks, ${r.personnel} personnel, ${r.aircraft} aircraft (${r.status})`
    )
    return `🚒 Current allocation —\n${lines.join('\n')}`
  }

  return "I can answer questions about risk factors, resource needs, evacuation zones, or wind what-if scenarios for the currently selected incident. Try one of the suggestions below, or ask in your own words."
}

const SUGGESTIONS = [
  '🔥 Show fires threatening villages',
  '💨 What happens if wind increases to 60 km/h?',
  '📋 Generate incident report',
  '🚨 What are the evacuation zones?',
  '🚒 Recommend resource deployment',
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export const CommandBar: React.FC = () => {
  const activeIncident = useIncidentStore((s) => s.getActiveIncident())
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "🔥 FireGuard Command Interface ready. Ask about risk, resources, evacuation, or wind what-if scenarios for the active incident.",
      timestamp: new Date().toISOString(),
    }
  ])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsThinking(true)

    await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    const response = getResponse(text, activeIncident)
    setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: response, timestamp: new Date().toISOString() }])
    setIsThinking(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-700/50 rounded-xl p-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
            <Terminal size={20} className="text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-cyan-200">Command Interface</h2>
            <p className="text-xs text-cyan-400">Real-time incident data, plain-language queries</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-cyan-900/40 border border-cyan-700/50 px-2 py-1 rounded-full">
            <Sparkles size={10} className="text-cyan-400" />
            <span className="text-xs text-cyan-300">{activeIncident ? 'Live Data' : 'No Incident'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-fire-orange text-slate-900' : 'bg-purple-500/20 border border-purple-500/30'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-purple-300" />}
              </div>
              <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-fire-orange/20 border border-fire-orange/30 text-slate-200'
                  : 'bg-slate-800/80 border border-slate-700 text-slate-300'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-purple-500/20 border border-purple-500/30">
              <Bot size={14} className="text-purple-300" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                  animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => sendMessage(s)}
              className="flex-shrink-0 text-[10px] bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap">
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask about the active incident..."
          className="flex-1 bg-slate-800 border border-slate-600 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isThinking}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 rounded-xl text-white transition-all"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}