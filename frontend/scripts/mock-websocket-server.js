import { WebSocketServer, WebSocket } from 'ws'

const PORT = 8000
const wss = new WebSocketServer({ port: PORT })

// Nepal fire-prone locations
const locations = [
  { lat: 27.7172, lng: 85.3240, name: 'Kathmandu Valley' },
  { lat: 28.2096, lng: 83.9856, name: 'Pokhara Region' },
  { lat: 27.5291, lng: 84.3542, name: 'Chitwan NP' },
  { lat: 28.9965, lng: 82.7394, name: 'Dolpa District' },
  { lat: 28.3710, lng: 81.4203, name: 'Bardiya NP' },
  { lat: 28.5535, lng: 84.5595, name: 'Manaslu Conservation' },
  { lat: 28.1688, lng: 85.5222, name: 'Langtang NP' },
  { lat: 27.3360, lng: 86.7147, name: 'Sagarmatha NP' },
  { lat: 27.0104, lng: 87.3123, name: 'Taplejung District' },
  { lat: 28.8326, lng: 83.2700, name: 'Mustang Region' },
]

const DANGER_RATINGS = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'EXTREME']
const SMOKE_LEVELS = ['LIGHT', 'MODERATE', 'HEAVY', 'DENSE']

let incidentCounter = 0

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function randInt(min, max) {
  return Math.floor(rand(min, max))
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateMockIncident() {
  const location = pick(locations)
  const incidentId = `INC-${Date.now()}-${incidentCounter++}`
  return {
    id: incidentId,
    location,
    confidence: rand(0.72, 1.0),
  }
}

function generateRiskUpdate(score) {
  return {
    score: Math.min(100, Math.max(0, score + (Math.random() - 0.5) * 20)),
    feature_importance: {
      wind_speed: rand(0, 1),
      temperature: rand(0, 1),
      vegetation_density: rand(0, 1),
      terrain_slope: rand(0, 1),
      proximity_to_structures: rand(0, 1),
      drought_index: rand(0, 1),
    },
    weather_data: {
      wind_speed: rand(5, 60),
      temperature: rand(20, 42),
      humidity: rand(10, 50),
      wind_direction: randInt(0, 360),
    },
    danger_level: pick(DANGER_RATINGS),
  }
}

function generateSimulationPolygon(lat, lng, radiusKm) {
  const points = []
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2
    const jitter = 0.7 + Math.random() * 0.6
    const offsetLat = (Math.cos(angle) * radiusKm * jitter) / 111
    const offsetLng = (Math.sin(angle) * radiusKm * jitter) / (111 * Math.cos((lat * Math.PI) / 180))
    points.push([lng + offsetLng, lat + offsetLat])
  }
  points.push(points[0])
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [points] },
        properties: {},
      },
    ],
  }
}

function generateImpactUpdate() {
  return {
    trees_lost: randInt(500, 80000),
    wildlife_affected: randInt(50, 15000),
    co2_tons: randInt(200, 120000),
    dollar_damage: randInt(100000, 60000000),
    area_burned_ha: rand(1, 500),
    population_affected: randInt(0, 50000),
  }
}

function generateSmokeDetection() {
  const aqi = randInt(50, 400)
  return {
    smoke_level: pick(SMOKE_LEVELS),
    aqi,
    visibility_km: Math.max(0.2, rand(0.5, 15)),
    plume_direction: randInt(0, 360),
    plume_speed_kmh: rand(5, 80),
    co_ppm: rand(2, 50),
    pm25: rand(20, 350),
    pm10: rand(40, 500),
    detected_at: new Date().toISOString(),
  }
}

function generateWeatherFire() {
  const ffmc = rand(70, 101)
  const dmc = rand(10, 200)
  const dc = rand(50, 800)
  const isi = rand(0, 40)
  const bui = rand(10, 200)
  const fwi = rand(5, 80)
  return {
    ffmc,
    dmc,
    dc,
    isi,
    bui,
    fwi,
    danger_rating: fwi < 10 ? 'LOW' : fwi < 20 ? 'MODERATE' : fwi < 30 ? 'HIGH' : fwi < 50 ? 'VERY_HIGH' : 'EXTREME',
    temp: rand(20, 42),
    humidity: rand(10, 50),
    wind_speed: rand(5, 60),
    wind_direction: randInt(0, 360),
    rain_mm: rand(0, 5),
    recorded_at: new Date().toISOString(),
  }
}

function generateReport() {
  const reports = [
    'Fire detected in high-risk area. Strong easterly winds accelerating spread toward forested slopes. Immediate evacuation of nearby villages recommended. Estimated spread rate: 300m/hour.',
    'Wildfire intelligence system confirms active fire signatures in national park buffer zone. Dry conditions (humidity <20%) and 45+ km/h gusts elevate danger to EXTREME. Aerial water-bombing requested.',
    'Community fire alert: Terrain analysis shows fire approaching settlement boundary. Dense pine vegetation increasing fuel load. Structural threat assessment in progress—3 villages within 5km evacuation radius.',
    'Nepal Forest Department: Satellite hotspot cluster detected. Fire Weather Index at VERY HIGH (FWI: 38). Smoke plume extending northeast. Air quality in Kathmandu Valley degrading.',
    'Critical wildfire event near protected area. Multiple detection cameras confirm ignition. Carbon emission estimate: 12,000 tons CO₂. Emergency coordination activated.',
  ]
  return pick(reports)
}

function simulateIncident(ws, incident) {
  let riskScore = rand(30, 75)
  let simulationMinute = 0

  const sendIfOpen = (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  // Detection
  sendIfOpen({
    type: 'detection_new',
    incident_id: incident.id,
    data: {
      lat: incident.location.lat + (Math.random() - 0.5) * 0.3,
      lng: incident.location.lng + (Math.random() - 0.5) * 0.3,
      timestamp: new Date().toISOString(),
      confidence: incident.confidence,
      source: pick(['CAMERA_NETWORK', 'SATELLITE_PASS', 'GROUND_SENSOR', 'DRONE']),
      location_name: incident.location.name,
      area_ha: rand(0.5, 50),
    },
  })

  // Risk updates every 2.5s
  const riskInterval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) { clearInterval(riskInterval); return }
    const riskData = generateRiskUpdate(riskScore)
    riskScore = riskData.score
    sendIfOpen({ type: 'risk_update', incident_id: incident.id, data: riskData })
  }, 2500)

  // Simulation frames every 3.5s
  const simInterval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) { clearInterval(simInterval); return }
    sendIfOpen({
      type: 'simulation_frame',
      incident_id: incident.id,
      data: {
        minute_offset: simulationMinute,
        polygon_geojson: generateSimulationPolygon(
          incident.location.lat,
          incident.location.lng,
          0.5 + (simulationMinute / 180) * 6
        ),
      },
    })
    simulationMinute = Math.min(180, simulationMinute + 30)
  }, 3500)

  // Smoke detection at 1s
  setTimeout(() => sendIfOpen({ type: 'smoke_detection', incident_id: incident.id, data: generateSmokeDetection() }), 1000)

  // Satellite hotspots at 2s
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      sendIfOpen({
        type: 'satellite_hotspot',
        incident_id: incident.id,
        data: {
          lat: incident.location.lat + (Math.random() - 0.5) * 0.25,
          lng: incident.location.lng + (Math.random() - 0.5) * 0.25,
          confidence: rand(0.75, 1.0),
          source: 'NASA_FIRMS',
        },
      })
    }
  }, 2000)

  // Weather + Fire at 3s
  setTimeout(() => sendIfOpen({ type: 'weather_fire', incident_id: incident.id, data: generateWeatherFire() }), 3000)

  // Impact update at 5s
  setTimeout(() => sendIfOpen({ type: 'impact_update', incident_id: incident.id, data: generateImpactUpdate() }), 5000)

  // Report at 7s
  setTimeout(() => sendIfOpen({ type: 'report_ready', incident_id: incident.id, data: { content: generateReport() } }), 7000)

  // Cleanup after 90s
  setTimeout(() => { clearInterval(riskInterval); clearInterval(simInterval) }, 90000)
}

wss.on('connection', (ws) => {
  console.log('[FireGuard] Client connected')

  // Initial burst — send 2 incidents immediately for demo
  const incident0 = generateMockIncident()
  console.log(`[Immediate] Incident ${incident0.id} @ ${incident0.location.name}`)
  simulateIncident(ws, incident0)

  setTimeout(() => {
    const incident1 = generateMockIncident()
    console.log(`[Immediate] Incident ${incident1.id} @ ${incident1.location.name}`)
    simulateIncident(ws, incident1)
  }, 2000)

  // Ongoing incidents every 8-15 seconds
  const incidentInterval = setInterval(() => {
    const incident = generateMockIncident()
    console.log(`[FireGuard] Simulating incident ${incident.id} at ${incident.location.name}`)
    simulateIncident(ws, incident)
  }, 8000 + Math.random() * 7000)

  ws.on('close', () => {
    console.log('[FireGuard] Client disconnected')
    clearInterval(incidentInterval)
  })

  ws.on('error', (error) => console.error('[FireGuard] WebSocket error:', error))
})

console.log(`[FireGuard Nepal] Mock WS server → ws://localhost:${PORT}/ws/live`)
console.log('[FireGuard Nepal] Simulating Nepal wildfire incidents...')
