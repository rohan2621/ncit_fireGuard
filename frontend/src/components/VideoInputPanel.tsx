import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Link as LinkIcon, Play, Square, AlertCircle, Loader2, StopCircle, Tag } from 'lucide-react'
import { LocationPicker } from './LocationPicker'

type VideoSource = 'file' | 'webcam' | 'stream'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface StreamEntry {
  id: string
  name: string
  url: string
  lat: number
  lng: number
  status: string | null
  isWatching: boolean
  streamId: string | null        // ← backend's UUID, used for DELETE
  stopTimer: ReturnType<typeof setTimeout> | null
}
export const VideoInputPanel: React.FC = () => {
  const [sourceType, setSourceType] = useState<VideoSource>('file')
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [detectionActive, setDetectionActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [lat, setLat] = useState(27.7)
  const [lng, setLng] = useState(85.3)
  const [streams, setStreams] = useState<StreamEntry[]>([
    { id: crypto.randomUUID(), name: '', url: '', lat: 27.7, lng: 85.3,
      status: null, isWatching: false, streamId: null, stopTimer: null },
  ])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const webcamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch((err) => console.warn('Autoplay blocked:', err))
      }
      setIsWebcamActive(true)
    } catch (error) {
      console.error('Failed to access webcam:', error)
      alert('Unable to access webcam. Please check permissions.')
    }
  }

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (webcamIntervalRef.current) {
      clearInterval(webcamIntervalRef.current)
      webcamIntervalRef.current = null
    }
    setIsWebcamActive(false)
    setDetectionActive(false)
  }

  const sendWebcamFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const formData = new FormData()
      formData.append('file', blob, 'frame.jpg')
      try {
        const res = await fetch(`${API_URL}/detect/webcam?lat=${lat}&lng=${lng}`, {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (data.status === 'incident_created') {
          setStatusMessage(`🔥 Incident created: ${data.incident_id}`)
        }
      } catch (err) {
        console.error('Webcam frame send failed:', err)
      }
    }, 'image/jpeg')
  }

  const toggleDetection = () => {
    if (sourceType === 'webcam') {
      if (!detectionActive) {
        webcamIntervalRef.current = setInterval(sendWebcamFrame, 1000)
        setDetectionActive(true)
        setStatusMessage('Monitoring webcam for fire/smoke...')
      } else {
        if (webcamIntervalRef.current) clearInterval(webcamIntervalRef.current)
        setDetectionActive(false)
        setStatusMessage(null)
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (videoRef.current) {
      const url = URL.createObjectURL(file)
      videoRef.current.src = url
      videoRef.current.load()
      videoRef.current.play().catch((err) => console.warn('Autoplay blocked:', err))
    }

    setIsSubmitting(true)
    setStatusMessage('Uploading and analyzing video...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/detect/upload?lat=${lat}&lng=${lng}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.status === 'incident_created') {
        setStatusMessage(
          `🔥 Incident created: ${data.incident_id} (${data.positive_frames}/${data.total_sampled} frames positive)`
        )
      } else {
        setStatusMessage(
          `No incident confirmed (${data.positive_frames}/${data.total_sampled} frames positive)`
        )
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setStatusMessage('Upload failed — check backend connection')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Stream helpers ─────────────────────────────────────────────────────────
  const addStreamRow = () => {
    setStreams((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        url: '',
        lat,
        lng,
        status: null,
        isWatching: false,
        stopTimer: null,
      },
    ])
  }

  const removeStreamRow = (id: string) => {
    setStreams((prev) => {
      const entry = prev.find((s) => s.id === id)
      if (entry?.stopTimer) clearTimeout(entry.stopTimer)
      return prev.filter((s) => s.id !== id)
    })
  }

  const updateStreamField = (
    id: string,
    field: keyof Pick<StreamEntry, 'url' | 'lat' | 'lng' | 'name'>,
    value: string | number
  ) => {
    setStreams((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const watchStream = async (id: string) => {
    const entry = streams.find((s) => s.id === id)
    if (!entry || !entry.url) return
  
    setStreams((prev) =>
      prev.map((s) => s.id === id ? { ...s, isWatching: true, status: 'Resolving stream...' } : s)
    )
  
    try {
      const params = new URLSearchParams({
        url: entry.url,
        lat: String(entry.lat),
        lng: String(entry.lng),
        name: entry.name || `Source at ${entry.lat},${entry.lng}`,
      })
  
      const res = await fetch(`${API_URL}/detect/stream?${params}`, { method: 'POST' })
      const data = await res.json()
      const maxSeconds = data.max_duration_seconds ?? 120
      const streamId = data.stream_id  // ← save this
  
      const timer = setTimeout(() => {
        setStreams((prev) =>
          prev.map((s) =>
            s.id === id && s.isWatching
              ? { ...s, isWatching: false, status: 'Finished — check Incident Feed for results', stopTimer: null }
              : s
          )
        )
      }, maxSeconds * 1000)
  
      setStreams((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, isWatching: true, streamId, status: `Watching (max ${maxSeconds}s)`, stopTimer: timer }
            : s
        )
      )
    } catch (err) {
      console.error('Stream request failed:', err)
      setStreams((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isWatching: false, status: 'Failed — check backend' } : s
        )
      )
    }
  }

  const stopStream = async (id: string) => {
    const entry = streams.find((s) => s.id === id)
    if (!entry) return
  
    if (entry.stopTimer) clearTimeout(entry.stopTimer)
  
    if (entry.streamId) {
      try {
        await fetch(`${API_URL}/detect/stream/${entry.streamId}`, { method: 'DELETE' })
      } catch (err) {
        console.error('Stop stream failed:', err)
      }
    }
  
    setStreams((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, isWatching: false, streamId: null, status: 'Stopped manually', stopTimer: null }
          : s
      )
    )
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (isWebcamActive) stopWebcam()
      streams.forEach((s) => {
        if (s.stopTimer) clearTimeout(s.stopTimer)
      })
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700 overflow-hidden overflow-y-auto"
    >
      {/* Tabs */}
      <div className="flex gap-0 px-4 pt-3 border-b border-slate-700">
        {(['file', 'webcam', 'stream'] as const).map((type) => (
          <button
            key={type}
            onClick={() => {
              if (type !== 'webcam' && isWebcamActive) stopWebcam()
              setSourceType(type)
              setStatusMessage(null)
            }}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
              sourceType === type
                ? 'text-fire-orange border-fire-orange'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            {type === 'file' && 'File Upload'}
            {type === 'webcam' && 'Webcam'}
            {type === 'stream' && 'Stream URL'}
          </button>
        ))}
      </div>

      {sourceType !== 'stream' && (
        <div className="px-3 pt-3">
          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => {
              setLat(newLat)
              setLng(newLng)
            }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {sourceType !== 'stream' && (
          <div className="flex-1 bg-black rounded-lg m-3 overflow-hidden relative min-h-[160px]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              controls={sourceType !== 'webcam'}
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {detectionActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 border-2 border-fire-orange pointer-events-none"
              >
                <div className="absolute top-2 left-2 bg-fire-red text-white px-2 py-1 rounded text-xs font-semibold">
                  DETECTION ACTIVE
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div className="px-3 pb-3 space-y-3 overflow-y-auto">
          {/* ── File upload ── */}
          {sourceType === 'file' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-fire-orange text-slate-900 rounded-lg font-semibold hover:bg-fire-red transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {isSubmitting ? 'Analyzing...' : 'Choose File'}
            </button>
          )}

          {/* ── Webcam ── */}
          {sourceType === 'webcam' && (
            <div className="flex gap-2">
              <button
                onClick={isWebcamActive ? stopWebcam : startWebcam}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isWebcamActive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-fire-orange hover:bg-fire-red text-slate-900'
                }`}
              >
                {isWebcamActive ? (
                  <><Square size={18} /> Stop</>
                ) : (
                  <><Play size={18} /> Start Webcam</>
                )}
              </button>
            </div>
          )}

          {/* ── Stream URL ── */}
          {sourceType === 'stream' && (
            <div className="space-y-3">
              {streams.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="space-y-2 bg-slate-800/60 border border-slate-700 rounded-lg p-2.5"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest">
                      SOURCE {idx + 1}
                    </span>
                    {streams.length > 1 && (
                      <button
                        onClick={() => removeStreamRow(entry.id)}
                        className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Name field — so you know which source this is in the incident feed */}
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-slate-500 shrink-0" />
                    <input
                      type="text"
                      placeholder="Name this source (e.g. Kathmandu North)"
                      value={entry.name}
                      onChange={(e) => updateStreamField(entry.id, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder-slate-600 focus:outline-none focus:border-fire-orange text-xs"
                    />
                  </div>

                  {/* URL field */}
                  <input
                    type="text"
                    placeholder="Stream URL (YouTube, etc.)"
                    value={entry.url}
                    onChange={(e) => updateStreamField(entry.id, 'url', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-fire-orange text-sm"
                  />

                  {/* Location picker */}
                  <LocationPicker
                    lat={entry.lat}
                    lng={entry.lng}
                    onChange={(newLat, newLng) => {
                      updateStreamField(entry.id, 'lat', newLat)
                      updateStreamField(entry.id, 'lng', newLng)
                    }}
                  />

                  {/* Watch / Stop buttons */}
                  {entry.isWatching ? (
                    <div className="flex gap-2">
                      {/* Watching indicator */}
                      <div className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-900/40 border border-amber-700/50 rounded-lg text-amber-300 text-sm font-semibold">
                        <Loader2 size={14} className="animate-spin" />
                        {entry.name ? `Watching — ${entry.name}` : 'Watching...'}
                      </div>
                      {/* Stop button */}
                      <button
                        onClick={() => stopStream(entry.id)}
                        title="Stop watching this stream"
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700/50 text-red-300 hover:text-red-100 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <StopCircle size={15} />
                        Stop
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => watchStream(entry.id)}
                      disabled={!entry.url}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-fire-orange text-slate-900 rounded-lg font-semibold text-sm hover:bg-fire-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <LinkIcon size={15} />
                      Watch Stream
                    </button>
                  )}

                  {/* Status line */}
                  {entry.status && (
                    <p
                      className={`text-[10px] text-center ${
                        entry.status.startsWith('Stopped')
                          ? 'text-red-400'
                          : entry.status.startsWith('Finished')
                          ? 'text-green-400'
                          : entry.status.startsWith('Failed')
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {entry.status}
                    </p>
                  )}

                  {/* Name tag shown while watching so you always know which source */}
                  {entry.isWatching && entry.name && (
                    <p className="text-[10px] text-center text-slate-500">
                      📍 {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              ))}

              <button
                onClick={addStreamRow}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm hover:border-fire-orange hover:text-fire-orange transition-colors"
              >
                + Add Another Stream
              </button>

              <p className="text-xs text-slate-400 flex items-center gap-1">
                <AlertCircle size={14} /> Each source is watched independently by the backend
              </p>
            </div>
          )}

          {/* Webcam detection toggle */}
          {sourceType === 'webcam' && isWebcamActive && (
            <button
              onClick={toggleDetection}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                detectionActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
              }`}
            >
              {detectionActive ? (
                <><Square size={18} /> Stop Detection</>
              ) : (
                <><AlertCircle size={18} /> Start Detection</>
              )}
            </button>
          )}

          {statusMessage && (
            <p className="text-xs text-center text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
              {statusMessage}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </motion.div>
  )
}