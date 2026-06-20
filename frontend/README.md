# FireGuard Nexus - Frontend Dashboard

A real-time wildfire intelligence platform dashboard built with React, Tailwind CSS, and Leaflet mapping.

## Features

- **Real-time WebSocket Integration**: Receives incident updates from backend via WebSocket
- **Interactive Leaflet Map**: Central integration point with 5 interactive layers:
  - Detection markers (fire incidents)
  - Satellite hotspots (NASA FIRMS data)
  - Risk heatmap (intensity driven by risk scores)
  - Spread polygons (10/30/60/180 minute simulations)
  - Evacuation radius (dynamic circles)
- **Live Incident Feed**: Reverse-chronological list with real-time updates
- **Incident Detail Panel**: Risk scores, impact metrics, generated reports
- **Video Input Panel**: File upload, webcam access, or stream URL input
- **Alert System**: Toast notifications for fire detections with auto-dismiss
- **Dark Command-Center Aesthetic**: Tailwind CSS with fire-themed colors

## Tech Stack

- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Leaflet + react-leaflet** - Mapping
- **leaflet.heat** - Heatmap layer
- **Zustand** - State management
- **Vite** - Build tool
- **WebSocket** - Real-time communication

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env.local
   ```
   
   Adjust `VITE_WS_URL` if your backend is running on a different address.

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

### Mock WebSocket Server (for development without backend)

To test the frontend independently:

1. **Start the mock WebSocket server** (in a separate terminal):
   ```bash
   npm run mock-ws
   ```
   
   This simulates fire incidents with all message types every 8-12 seconds.

2. **Connect the frontend**: The app will automatically connect to `ws://localhost:8000/ws/live`

## WebSocket Contract

The backend sends JSON messages with this shape:

```typescript
type WebSocketMessage = 
  | {
      type: 'detection_new'
      incident_id: string
      data: { lat, lng, timestamp, confidence, source }
    }
  | {
      type: 'risk_update'
      incident_id: string
      data: { score, feature_importance, weather_data }
    }
  | {
      type: 'simulation_frame'
      incident_id: string
      data: { minute_offset, polygon_geojson }
    }
  | {
      type: 'impact_update'
      incident_id: string
      data: { trees_lost, wildlife_affected, co2_tons, dollar_damage }
    }
  | {
      type: 'report_ready'
      incident_id: string
      data: { content }
    }
  | {
      type: 'satellite_hotspot'
      incident_id: string
      data: { lat, lng, confidence, source: 'NASA_FIRMS' }
    }
```

## Components

- **`Map.tsx`** - Leaflet map with all 5 layers and layer control panel
- **`IncidentFeed.tsx`** - Live feed of incidents with status indicators
- **`IncidentDetailPanel.tsx`** - Detailed view of selected incident
- **`VideoInputPanel.tsx`** - File/webcam/stream input with detection toggle
- **`AlertSystem.tsx`** - Toast notifications for fire detections

## State Management

Uses **Zustand** for centralized state:

```typescript
interface IncidentStore {
  incidents: Incident[]
  selectedIncidentId: string | null
  wsConnected: boolean
  addOrUpdateIncident: (message: WebSocketMessage) => void
  selectIncident: (id: string | null) => void
  setWSConnected: (connected: boolean) => void
}
```

## Build

```bash
npm run build
```

Output will be in `dist/` directory.

## Docker

Build and run in Docker:

```bash
docker build -t fireguard-frontend .
docker run -p 5173:5173 fireguard-frontend
```

## Layout Modes

- **Dashboard**: Full 4-column layout (Feed, Map, Map, Video)
- **Map Focus**: Large map on left, Feed on right
- **Analysis**: Feed on left, Video on right

Switch via buttons in the header.

## Development Notes

- The app automatically reconnects if the WebSocket disconnects (with exponential backoff)
- All styling is Tailwind CSS — no custom CSS files except minimal Leaflet overrides
- Framer Motion handles all animations (incident cards slide in, detail panel slides from right)
- Map layers are toggleable via the control panel on the map
- Simulation time can be controlled via slider when spread polygons are visible

## API Integration Checklist

When connecting to the real backend:

- [ ] Ensure backend sends messages to `ws://frontend:5173` (or your frontend URL)
- [ ] Verify WebSocket connects to correct endpoint
- [ ] Test all 6 message types
- [ ] Validate GeoJSON polygon format for simulation_frame
- [ ] Confirm feature_importance object keys match risk factor names
- [ ] Test with actual NASA FIRMS satellite data

## Future Enhancements

- Export incident data as PDF reports
- Historical incident archive and timeline
- ML-based spread prediction refinement
- Integration with emergency response APIs
- Multi-incident comparison tools
- Custom alert thresholds per user

## License

MIT
