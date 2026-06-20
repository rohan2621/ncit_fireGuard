import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  LayerGroup,
  Marker,
  Popup,
  Polygon,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import { useIncidentStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, TrendingUp, Flame, Wind, Layers,
  ZoomIn, ZoomOut, Crosshair, X, MapPin, AlertTriangle,
  Clock, Shield, Activity,
} from 'lucide-react'
import { Incident } from '../types'

// ─── Nepal ────────────────────────────────────────────────────────────────────
const NEPAL_CENTER: [number, number] = [28.3949, 84.124]
const NEPAL_BOUNDS: [[number, number], [number, number]] = [[26.0, 79.5], [30.5, 88.5]]

// ─── Animated pulsing fire marker ─────────────────────────────────────────────
function makeFireIcon(score: number, selected: boolean) {
  const color = score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : '#fbbf24'
  const glow = score >= 80 ? '#ef444488' : score >= 60 ? '#f9731688' : '#fbbf2488'
  const size = selected ? 44 : 36
  const svg = `
<svg width="${size}" height="${size + 8}" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow">
      <stop offset="0%" stop-color="${glow}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${color}" flood-opacity="0.7"/>
    </filter>
  </defs>
  <ellipse cx="22" cy="50" rx="10" ry="3" fill="rgba(0,0,0,0.4)"/>
  <circle cx="22" cy="22" r="20" fill="url(#glow)" opacity="0.5"/>
  <path d="M22 2C22 2 6 18 6 28C6 37.9 13.2 46 22 46C30.8 46 38 37.9 38 28C38 18 22 2 22 2Z" fill="${color}" filter="url(#shadow)"/>
  <path d="M22 10C22 10 10 22 10 30C10 34.4 15.4 38 22 38C28.6 38 34 34.4 34 30C34 22 22 10 22 10Z" fill="#f97316"/>
  <circle cx="22" cy="28" r="7" fill="#fbbf24"/>
  <circle cx="22" cy="28" r="3.5" fill="white" opacity="0.8"/>
  ${selected ? `<circle cx="22" cy="22" r="20" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 2" opacity="0.8"/>` : ''}
</svg>`
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  })
}

function makeSatIcon() {
  const svg = `
<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="11" r="10" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
  <circle cx="11" cy="11" r="5" fill="#fbbf24" opacity="0.8"/>
  <circle cx="11" cy="11" r="2" fill="#f97316"/>
</svg>`
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  })
}

const satelliteIcon = makeSatIcon()

// ─── Pulsing CSS rings on the map (DOM overlay) ───────────────────────────────
function PulseLayer({ incidents }: { incidents: Incident[] }) {
  const map = useMap()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    // update positions on every map move
    const update = () => {
      if (!containerRef.current) return
      const divs = containerRef.current.querySelectorAll<HTMLDivElement>('[data-lat]')
      divs.forEach((div) => {
        const lat = parseFloat(div.dataset.lat!)
        const lng = parseFloat(div.dataset.lng!)
        const pt = map.latLngToContainerPoint([lat, lng])
        div.style.left = `${pt.x}px`
        div.style.top = `${pt.y}px`
      })
    }
    map.on('move zoom', update)
    update()
    return () => { map.off('move zoom', update) }
  }, [map, incidents])

  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:400;overflow:hidden;'

  // Render via portal using a pane
  useEffect(() => {
    const pane = map.getPane('overlayPane')!
    const host = document.createElement('div')
    host.style.cssText = 'position:absolute;inset:0;pointer-events:none;'
    host.id = 'pulse-host'
    pane.appendChild(host)
    containerRef.current = host

    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulseRing {
        0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.8; }
        100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
      }
      .pulse-ring {
        position: absolute;
        border-radius: 50%;
        border: 2px solid;
        pointer-events: none;
        animation: pulseRing 2s ease-out infinite;
      }
      .pulse-ring-2 { animation-delay: 0.7s; }
      .pulse-ring-3 { animation-delay: 1.4s; }
    `
    document.head.appendChild(style)

    return () => {
      host.remove()
      style.remove()
    }
  }, [map])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    incidents.forEach((inc) => {
      if (!inc.detection) return
      const score = inc.risk?.score ?? 50
      const color = score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : '#fbbf24'
      const size = 40
      const wrapper = document.createElement('div')
      wrapper.dataset.lat = String(inc.detection.lat)
      wrapper.dataset.lng = String(inc.detection.lng)
      wrapper.style.cssText = `position:absolute;width:${size}px;height:${size}px;`
      for (let i = 0; i < 3; i++) {
        const ring = document.createElement('div')
        ring.className = `pulse-ring pulse-ring-${i + 1}`
        ring.style.cssText = `width:${size}px;height:${size}px;border-color:${color};top:0;left:0;`
        wrapper.appendChild(ring)
      }
      containerRef.current!.appendChild(wrapper)
    })
    // trigger position update
    const evt = new Event('move')
    containerRef.current.dispatchEvent(evt)
  }, [incidents])

  // keep positions synced
  useMapEvents({ move: () => {}, zoom: () => {} })
  return null
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function HeatmapLayer({ points, enabled }: { points: [number, number, number][]; enabled: boolean }) {
  const map = useMap()
  const ref = useRef<any>(null)
  useEffect(() => {
    if (!enabled) { ref.current && map.removeLayer(ref.current); ref.current = null; return }
    if (!points.length) return
    ref.current && map.removeLayer(ref.current)
    ref.current = (L as any).heatLayer(points, {
      radius: 40, blur: 35, maxZoom: 17, max: 1,
      gradient: { 0.0: '#0ea5e9', 0.3: '#22c55e', 0.5: '#eab308', 0.75: '#f97316', 1.0: '#ef4444' },
    }).addTo(map)
    return () => { ref.current && map.removeLayer(ref.current); ref.current = null }
  }, [points, enabled, map])
  return null
}

// ─── FlyTo selected incident ─────────────────────────────────────────────────
function FlyToIncident({ incident }: { incident: Incident | null }) {
  const map = useMap()
  const prevId = useRef<string | null>(null)
  useEffect(() => {
    if (incident?.detection && incident.id !== prevId.current) {
      prevId.current = incident.id
      map.flyTo([incident.detection.lat, incident.detection.lng], 11, { duration: 1.4, easeLinearity: 0.3 })
    }
  }, [incident, map])
  return null
}

// ─── Map-level click to deselect ─────────────────────────────────────────────
function MapClickHandler({ onBgClick }: { onBgClick: () => void }) {
  useMapEvents({ click: onBgClick })
  return null
}

// ─── Zoom controls ────────────────────────────────────────────────────────────
function ZoomControls() {
  const map = useMap()
  return (
    <div className="absolute bottom-4 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
      <button onClick={() => map.zoomIn()} className="w-8 h-8 bg-slate-900/90 border border-slate-600 hover:border-fire-orange hover:bg-slate-800 rounded-lg text-slate-200 flex items-center justify-center transition-all shadow-lg">
        <ZoomIn size={14} />
      </button>
      <button onClick={() => map.zoomOut()} className="w-8 h-8 bg-slate-900/90 border border-slate-600 hover:border-fire-orange hover:bg-slate-800 rounded-lg text-slate-200 flex items-center justify-center transition-all shadow-lg">
        <ZoomOut size={14} />
      </button>
      <button onClick={() => map.flyTo(NEPAL_CENTER, 7, { duration: 1.2 })} className="w-8 h-8 bg-slate-900/90 border border-slate-600 hover:border-blue-500 hover:bg-slate-800 rounded-lg text-slate-400 flex items-center justify-center transition-all shadow-lg" title="Reset view">
        <Crosshair size={13} />
      </button>
    </div>
  )
}

// ─── Wind direction overlay ───────────────────────────────────────────────────
function WindOverlay({ speed, direction }: { speed: number; direction: number }) {
  const dirLabel = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(direction / 45) % 8]
  return (
    <div className="absolute bottom-4 left-3 z-[1000] bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-xs pointer-events-none backdrop-blur-sm shadow-xl">
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8">
          <svg viewBox="0 0 32 32" className="w-8 h-8">
            <circle cx="16" cy="16" r="14" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            {['N','E','S','W'].map((d, i) => (
              <text key={d} x={16 + 10 * Math.sin(i * Math.PI / 2)} y={16 - 10 * Math.cos(i * Math.PI / 2)}
                textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize="5" fontFamily="sans-serif">{d}</text>
            ))}
            <g transform={`rotate(${direction}, 16, 16)`}>
              <polygon points="16,4 13,16 16,14 19,16" fill="#f97316" />
              <polygon points="16,28 13,16 16,18 19,16" fill="#475569" />
            </g>
          </svg>
        </div>
        <div>
          <div className="text-slate-200 font-bold">{speed.toFixed(0)} <span className="font-normal text-slate-400">km/h</span></div>
          <div className="text-slate-500 text-[10px]">{dirLabel}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Bar at top ─────────────────────────────────────────────────────────
function StatsBar({ incidents }: { incidents: Incident[] }) {
  const totalRisk = incidents.reduce((a, i) => a + (i.risk?.score ?? 0), 0)
  const avgRisk = incidents.length ? totalRisk / incidents.length : 0
  const criticalCount = incidents.filter(i => (i.risk?.score ?? 0) >= 80).length

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2 shadow-2xl">
        {[
          { icon: <Flame size={11} className="text-red-400" />, label: 'Active', value: incidents.length, color: 'text-red-300' },
          { icon: <AlertTriangle size={11} className="text-orange-400" />, label: 'Critical', value: criticalCount, color: 'text-orange-300' },
          { icon: <Activity size={11} className="text-amber-400" />, label: 'Avg Risk', value: avgRisk.toFixed(0), color: 'text-amber-300' },
        ].map(({ icon, label, value, color }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="w-px h-5 bg-slate-700" />}
            <div className="flex items-center gap-1.5">
              {icon}
              <span className="text-slate-500 text-[10px]">{label}</span>
              <span className={`text-xs font-black ${color}`}>{value}</span>
            </div>
          </React.Fragment>
        ))}
        {incidents.length > 0 && (
          <>
            <div className="w-px h-5 bg-slate-700" />
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
            <span className="text-[10px] text-red-400 font-semibold">LIVE</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Incident detail drawer ───────────────────────────────────────────────────
function IncidentDrawer({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {incident && (
        <motion.div
          key={incident.id}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="absolute right-0 top-0 bottom-0 w-72 z-[999] pointer-events-auto"
        >
          <div className="h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-red-950/60 to-slate-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-red-500/20 rounded-md">
                  <Flame size={14} className="text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-200 leading-none">
                    {incident.detection?.location_name ?? `INC-${incident.id.slice(0, 8).toUpperCase()}`}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{incident.id}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Status badges */}
              <div className="flex flex-wrap gap-1.5">
                {incident.severity && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    incident.severity === 'CRITICAL' ? 'bg-red-900/60 border border-red-700/50 text-red-300' :
                    incident.severity === 'HIGH' ? 'bg-orange-900/60 border border-orange-700/50 text-orange-300' :
                    'bg-amber-900/60 border border-amber-700/50 text-amber-300'
                  }`}>{incident.severity}</span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {incident.status ?? 'ACTIVE'}
                </span>
              </div>

              {/* Risk Score */}
              {incident.risk && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Risk Score</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-black ${incident.risk.score >= 80 ? 'text-red-400' : incident.risk.score >= 60 ? 'text-orange-400' : 'text-amber-400'}`}>
                      {Math.round(incident.risk.score)}
                    </span>
                    <div className="flex-1">
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <motion.div
                          className={`h-full rounded-full ${incident.risk.score >= 80 ? 'bg-red-500' : 'bg-orange-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${incident.risk.score}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-0.5">/100</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detection info */}
              {incident.detection && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Detection</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500 text-[10px]">Latitude</p>
                      <p className="text-slate-200 font-mono">{incident.detection.lat.toFixed(4)}°N</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px]">Longitude</p>
                      <p className="text-slate-200 font-mono">{incident.detection.lng.toFixed(4)}°E</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px]">Confidence</p>
                      <p className="text-slate-200 font-bold">{(incident.detection.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px]">Source</p>
                      <p className="text-slate-200">{incident.detection.source}</p>
                    </div>
                    {incident.detection.area_ha && (
                      <div className="col-span-2">
                        <p className="text-slate-500 text-[10px]">Area</p>
                        <p className="text-fire-orange font-bold">{incident.detection.area_ha.toFixed(1)} ha</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Weather */}
              {incident.risk?.weather_data && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Weather</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: '🌡️ Temp', value: `${incident.risk.weather_data.temperature.toFixed(0)}°C` },
                      { label: '💧 Humidity', value: `${incident.risk.weather_data.humidity.toFixed(0)}%` },
                      { label: '💨 Wind', value: `${incident.risk.weather_data.wind_speed.toFixed(0)} km/h` },
                      { label: '🧭 Direction', value: `${incident.risk.weather_data.wind_direction ?? '—'}°` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-slate-500 text-[10px]">{label}</p>
                        <p className="text-slate-200">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact */}
              {incident.impact && (
                <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3">
                  <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2">Impact</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trees lost</span>
                      <span className="text-red-300 font-mono">{incident.impact.trees_lost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Population</span>
                      <span className="text-orange-300 font-mono">{incident.impact.population_affected?.toLocaleString() ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Damage</span>
                      <span className="text-amber-300 font-mono">NPR {(incident.impact.dollar_damage / 1_000_000).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              {incident.ai_recommendations && incident.ai_recommendations.length > 0 && (
                <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3">
                  <p className="text-[10px] text-purple-400 uppercase tracking-widest mb-2">AI Actions</p>
                  <div className="space-y-1.5">
                    {incident.ai_recommendations.slice(0, 3).map((rec, i) => (
                      <div key={i} className={`text-[10px] px-2 py-1 rounded-lg ${
                        rec.priority === 'CRITICAL' ? 'bg-red-900/40 text-red-300' :
                        rec.priority === 'HIGH' ? 'bg-orange-900/40 text-orange-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {rec.action}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline snippet */}
              {incident.timeline && incident.timeline.length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                    <Clock size={9} className="inline mr-1" />Recent Events
                  </p>
                  <div className="space-y-1.5">
                    {[...incident.timeline].reverse().slice(0, 3).map((ev, i) => (
                      <div key={i} className="text-[10px] text-slate-400 flex gap-2">
                        <span className="text-slate-600 font-mono flex-shrink-0">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Map layer controls ───────────────────────────────────────────────────────
interface LayerControls { detections: boolean; satellites: boolean; heatmap: boolean; simulation: boolean; evacuation: boolean }

// ─── Main Map component ───────────────────────────────────────────────────────
export const Map: React.FC = () => {
  const incidents = useIncidentStore((s) => s.incidents)
  const selectedId = useIncidentStore((s) => s.selectedIncidentId)
  const selectIncident = useIncidentStore((s) => s.selectIncident)
  const getActiveIncident = useIncidentStore((s) => s.getActiveIncident)

  const [layers, setLayers] = useState<LayerControls>({ detections: true, satellites: true, heatmap: true, simulation: true, evacuation: true })
  const [simTimeOffset, setSimTimeOffset] = useState(180)
  const [showLayers, setShowLayers] = useState(false)
  const [drawerIncident, setDrawerIncident] = useState<Incident | null>(null)

  // Track which incident to show in drawer
  useEffect(() => {
    if (selectedId) {
      const inc = incidents.find(i => i.id === selectedId) ?? null
      setDrawerIncident(inc)
    }
  }, [selectedId, incidents])

  const handleMarkerClick = useCallback((id: string) => {
    selectIncident(id)
  }, [selectIncident])

  const handleBgClick = useCallback(() => {
    selectIncident(null)
    setDrawerIncident(null)
  }, [selectIncident])

  // Heatmap points
  const heatPoints: [number, number, number][] = []
  incidents.forEach((inc) => {
    if (inc.detection && inc.risk) heatPoints.push([inc.detection.lat, inc.detection.lng, inc.risk.score / 100])
    inc.satellite_hotspots?.forEach(s => heatPoints.push([s.lat, s.lng, s.confidence * 0.8]))
  })

  // Wind data from selected or first incident
  const activeInc = getActiveIncident()
  const windSpeed = activeInc?.risk?.weather_data?.wind_speed ?? 0
  const windDir = activeInc?.risk?.weather_data?.wind_direction ?? 0

  const layerLabels: Record<keyof LayerControls, string> = {
    detections: '🔥 Fire Detections',
    satellites: '🛰️ Satellite Hotspots',
    heatmap: '🌡️ Risk Heatmap',
    simulation: '📡 Spread Zones',
    evacuation: '🚨 Evacuation Radius',
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-700/60 shadow-2xl">
      {/* Stats bar at top */}
      <StatsBar incidents={incidents} />

      {/* Layer toggle button */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-auto">
        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="mb-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden w-52"
            >
              <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
                <Layers size={12} className="text-fire-orange" />
                <span className="text-xs font-semibold text-slate-200">Map Layers</span>
              </div>
              <div className="p-3 space-y-2">
                {(Object.keys(layers) as (keyof LayerControls)[]).map((key) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      onClick={() => setLayers(p => ({ ...p, [key]: !p[key] }))}
                      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${layers[key] ? 'bg-fire-orange' : 'bg-slate-600'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${layers[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">{layerLabels[key]}</span>
                  </label>
                ))}
                {layers.simulation && (
                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-1.5">
                      <TrendingUp size={10} /> Spread Time: <span className="text-fire-orange font-mono">+{simTimeOffset}min</span>
                    </div>
                    <input type="range" min={10} max={180} step={10} value={simTimeOffset}
                      onChange={e => setSimTimeOffset(+e.target.value)}
                      className="w-full h-1.5 appearance-none rounded-full cursor-pointer accent-fire-orange"
                      style={{ background: `linear-gradient(to right,#f97316 0%,#f97316 ${((simTimeOffset-10)/170)*100}%,#334155 ${((simTimeOffset-10)/170)*100}%,#334155 100%)` }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowLayers(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-lg ${
            showLayers
              ? 'bg-fire-orange text-slate-900 border-fire-orange shadow-orange-500/20'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-fire-orange hover:text-fire-orange backdrop-blur-sm'
          }`}
        >
          {showLayers ? <EyeOff size={13} /> : <Eye size={13} />}
          Layers
        </button>
      </div>

      {/* Map */}
      <MapContainer
        center={NEPAL_CENTER} zoom={7} minZoom={6} maxZoom={16}
        maxBounds={NEPAL_BOUNDS} maxBoundsViscosity={0.8}
        scrollWheelZoom zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <HeatmapLayer points={heatPoints} enabled={layers.heatmap} />
        <PulseLayer incidents={layers.detections ? incidents.filter(i => i.detection) : []} />
        <FlyToIncident incident={incidents.find(i => i.id === selectedId) ?? null} />
        <MapClickHandler onBgClick={handleBgClick} />
        <ZoomControls />

        {/* Detection markers */}
        {layers.detections && (
          <LayerGroup>
            {incidents.filter(i => i.detection).map(incident => (
              <Marker
                key={incident.id}
                position={[incident.detection!.lat, incident.detection!.lng]}
                icon={makeFireIcon(incident.risk?.score ?? 50, incident.id === selectedId)}
                eventHandlers={{ click: () => handleMarkerClick(incident.id) }}
              >
                <Popup className="custom-popup" closeButton={false}>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 min-w-44 text-xs shadow-xl border border-slate-700">
                    <p className="font-bold text-fire-orange mb-2 flex items-center gap-1.5">
                      <Flame size={12} />
                      {incident.detection?.location_name ?? `INC-${incident.id.slice(0, 8).toUpperCase()}`}
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Confidence</span>
                        <span className="font-bold text-slate-200">{((incident.detection!.confidence) * 100).toFixed(1)}%</span>
                      </div>
                      {incident.risk && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Risk Score</span>
                          <span className={`font-bold ${incident.risk.score >= 80 ? 'text-red-400' : 'text-orange-400'}`}>{Math.round(incident.risk.score)}/100</span>
                        </div>
                      )}
                      {incident.severity && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Severity</span>
                          <span className="font-bold text-amber-300">{incident.severity}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleMarkerClick(incident.id)}
                      className="mt-2 w-full bg-fire-orange hover:bg-orange-400 text-slate-900 text-[10px] font-bold py-1 rounded-md transition-colors"
                    >
                      View Details →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </LayerGroup>
        )}

        {/* Satellite markers */}
        {layers.satellites && (
          <LayerGroup>
            {incidents.flatMap((inc, ii) =>
              (inc.satellite_hotspots ?? []).map((spot, si) => (
                <Marker key={`${ii}-${si}`} position={[spot.lat, spot.lng]} icon={satelliteIcon}>
                  <Popup closeButton={false}>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 min-w-36">
                      <p className="font-bold text-amber-400 mb-1">🛰️ NASA FIRMS</p>
                      <p className="text-slate-400">Confidence: <span className="text-slate-200 font-bold">{(spot.confidence * 100).toFixed(1)}%</span></p>
                      <p className="text-slate-500 text-[10px] mt-1">{spot.lat.toFixed(4)}°N, {spot.lng.toFixed(4)}°E</p>
                    </div>
                  </Popup>
                </Marker>
              ))
            )}
          </LayerGroup>
        )}

        {/* Spread polygons */}
        {layers.simulation && incidents.filter(i => i.simulation && i.detection).flatMap(incident =>
          (incident.simulation ?? [])
            .filter(sim => sim.minute_offset <= simTimeOffset)
            .map((sim, idx) => {
              const feat = sim.polygon_geojson?.features?.[0]
              if (!feat) return null
              if (!['Polygon', 'MultiPolygon'].includes(feat.geometry.type)) return null
              const raw = feat.geometry.type === 'Polygon' ? feat.geometry.coordinates[0] : feat.geometry.coordinates[0][0]
              const lls = raw.map(([lng, lat]: number[]) => [lat, lng])
              const colors = ['#ef4444', '#f97316', '#fbbf24', '#84cc16']
              return (
                <Polygon key={`poly-${incident.id}-${idx}`} positions={lls}
                  color={colors[idx % 4]} fillColor={colors[idx % 4]} fillOpacity={0.15} weight={2} dashArray="6,4">
                  <Popup closeButton={false}>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200">
                      📡 +{sim.minute_offset}min Spread Zone
                    </div>
                  </Popup>
                </Polygon>
              )
            })
        )}

        {/* Evacuation circles */}
        {layers.evacuation && incidents.filter(i => i.detection).map(incident => {
          if (!incident.detection) return null
          const r = (2 + ((incident.risk?.score ?? 30) / 100) * 8) * 1000
          const isSelected = incident.id === selectedId
          return (
            <Circle key={`evac-${incident.id}`}
              center={[incident.detection.lat, incident.detection.lng]}
              radius={r} color={isSelected ? '#f97316' : '#ef4444'}
              fillColor={isSelected ? '#f97316' : '#ef4444'} fillOpacity={isSelected ? 0.1 : 0.05}
              weight={isSelected ? 2.5 : 1.5} dashArray="8,6">
              <Popup closeButton={false}>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200">
                  🚨 Evacuation Zone: {(r / 1000).toFixed(1)} km radius
                </div>
              </Popup>
            </Circle>
          )
        })}
      </MapContainer>

      {/* Wind overlay - bottom left */}
      {windSpeed > 0 && <WindOverlay speed={windSpeed} direction={windDir} />}

      {/* Incident drawer - right side */}
      <IncidentDrawer incident={drawerIncident} onClose={() => { selectIncident(null); setDrawerIncident(null) }} />

      {/* No incidents placeholder */}
      <AnimatePresence>
        {incidents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]"
          >
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl px-8 py-6 text-center">
              <MapPin size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No active incidents</p>
              <p className="text-xs text-slate-600 mt-1">Monitoring Nepal region for wildfire events</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
