import React, { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Crosshair, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

function makePinIcon() {
  const svg = `
<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 1C7 1 1 7 1 14C1 23 14 35 14 35C14 35 27 23 27 14C27 7 21 1 14 1Z" fill="#f97316" stroke="#1e293b" stroke-width="1.5"/>
  <circle cx="14" cy="14" r="5" fill="#1e293b"/>
</svg>`
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  })
}
const pinIcon = makePinIcon()

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

interface LocationPickerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ lat, lng, onChange }) => {
  const [mapOpen, setMapOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation not supported by this browser')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
        setMapOpen(true) // show the map so the result is visible
      },
      (err) => {
        setLocateError(err.message || 'Failed to get location')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <MapPin size={13} className="text-fire-orange" /> Detection Location
        </label>
        <span className="text-[10px] text-slate-500 font-mono">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMapOpen((v) => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs font-medium hover:border-fire-orange hover:text-fire-orange transition-colors"
        >
          {mapOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {mapOpen ? 'Hide Map' : 'Pick on Map'}
        </button>
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs font-medium hover:border-fire-orange hover:text-fire-orange transition-colors disabled:opacity-50"
        >
          {locating ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
          {locating ? 'Locating...' : 'Use My Location'}
        </button>
      </div>

      {locateError && (
        <p className="text-[10px] text-red-400">{locateError}</p>
      )}

      {mapOpen && (
        <div className="w-full h-64 rounded-lg overflow-hidden border border-slate-700">
          <MapContainer
            center={[lat, lng]}
            zoom={9}
            scrollWheelZoom={true}
            zoomControl={true}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <ClickHandler onPick={onChange} />
            <Marker
              position={[lat, lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker
                  const pos = m.getLatLng()
                  onChange(pos.lat, pos.lng)
                },
              }}
            />
          </MapContainer>
        </div>
      )}

      {mapOpen && (
        <p className="text-[10px] text-slate-500">Click the map or drag the pin to set the detection location</p>
      )}
    </div>
  )
}