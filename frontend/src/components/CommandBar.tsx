import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Send, Bot, User, Sparkles } from 'lucide-react'

const NL_RESPONSES: Record<string, string> = {
  default: "I'm analyzing the current fire incident data. Ask me about risk factors, resource needs, evacuation zones, or what-if scenarios.",
  village: "🔍 Analyzing threat to nearby villages... Based on current wind direction (NE at 35 km/h) and fire spread rate, villages within 8km NE of the fire perimeter are at HIGH risk within the next 3 hours. Recommend immediate evacuation of Dolakha sector.",
  wind: "📊 Wind increase simulation: If wind speed increases to 60 km/h, the fire spread rate would increase by ~180%. Predicted area would reach 450 ha within 2 hours, threatening Zone B and C buffers. RECOMMEND: Pre-evacuate and deploy aerial assets immediately.",
  report: "📋 Generating incident report... Report includes: fire detection timestamp, risk analysis (score: see current panel), spread simulation results, resource deployment status, and impact assessment. Report is being compiled — check the Report tab when complete.",
  evacuate: "🚨 Evacuation zones analysis: Primary zone (0-3km radius) — IMMEDIATE evacuation required. Secondary zone (3-8km) — Prepare to evacuate. Tertiary zone (8-15km) — Monitor and standby. Estimated population in primary zone: see Impact panel.",
  resource: "🚒 Current resource status: Based on AI optimization, Zone A (active front) needs 4 trucks + 24 personnel. Zone B (flank) is staging 2 trucks + 16 personnel. Recommend deploying 1 additional air tanker to cut off NE spread vector.",
}

function getResponse(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('village') || q.includes('community') || q.includes('settlement')) return NL_RESPONSES.village
  if (q.includes('wind') && (q.includes('increase') || q.includes('what if') || q.includes('stronger'))) return NL_RESPONSES.wind
  if (q.includes('report') || q.includes('generate') || q.includes('summary')) return NL_RESPONSES.report
  if (q.includes('evacuate') || q.includes('evacuation') || q.includes('zone')) return NL_RESPONSES.evacuate
  if (q.includes('resource') || q.includes('truck') || q.includes('personnel') || q.includes('deploy')) return NL_RESPONSES.resource
  return NL_RESPONSES.default
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "🔥 FireGuard AI Commander ready. I have access to all live incident data. Ask me about risk, resources, evacuation, or run what-if scenarios.",
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

    await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
    const response = getResponse(text)
    setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: response, timestamp: new Date().toISOString() }])
    setIsThinking(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-700/50 rounded-xl p-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
            <Terminal size={20} className="text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-cyan-200">AI Command Interface</h2>
            <p className="text-xs text-cyan-400">Natural language incident control</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-cyan-900/40 border border-cyan-700/50 px-2 py-1 rounded-full">
            <Sparkles size={10} className="text-cyan-400" />
            <span className="text-xs text-cyan-300">AI Active</span>
          </div>
        </div>
      </div>

      {/* Messages */}
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
              <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
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

      {/* Suggestions */}
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

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask the AI commander..."
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
