import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Camera, Link as LinkIcon, Play, Square, AlertCircle } from 'lucide-react'

type VideoSource = 'file' | 'webcam' | 'stream'

export const VideoInputPanel: React.FC = () => {
  const [sourceType, setSourceType] = useState<VideoSource>('file')
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [streamUrl, setStreamUrl] = useState('')
  const [detectionActive, setDetectionActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsWebcamActive(true)
    } catch (error) {
      console.error('Failed to access webcam:', error)
      alert('Unable to access webcam. Please check permissions.')
    }
  }

  // Stop webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsWebcamActive(false)
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file)
      videoRef.current.src = url
    }
  }

  // Handle stream URL submission
  const handleStreamSubmit = () => {
    if (streamUrl && videoRef.current) {
      // Note: Direct HLS/DASH stream playback may have CORS issues
      // Backend would handle this via yt-dlp for YouTube streams
      videoRef.current.src = streamUrl
    }
  }

  useEffect(() => {
    return () => {
      if (isWebcamActive) {
        stopWebcam()
      }
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Camera size={18} /> Video Input
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 pt-3 border-b border-slate-700">
        {(['file', 'webcam', 'stream'] as const).map((type) => (
          <button
            key={type}
            onClick={() => {
              if (type !== 'webcam' && isWebcamActive) {
                stopWebcam()
              }
              setSourceType(type)
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

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Video Display */}
        <div className="flex-1 bg-black rounded-lg m-3 overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            controls={sourceType !== 'webcam'}
            autoPlay
            playsInline
          />

          {/* Detection Overlay */}
          {detectionActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 border-2 border-fire-orange animate-pulse-fire pointer-events-none"
            >
              <div className="absolute top-2 left-2 bg-fire-red text-white px-2 py-1 rounded text-xs font-semibold">
                DETECTION ACTIVE
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {!videoRef.current?.src && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Camera size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No video source selected</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-3 pb-3 space-y-3">
          {sourceType === 'file' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-fire-orange text-slate-900 rounded-lg font-semibold hover:bg-fire-red transition-colors"
            >
              <Upload size={18} /> Choose File
            </button>
          )}

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
                  <>
                    <Square size={18} /> Stop
                  </>
                ) : (
                  <>
                    <Play size={18} /> Start Webcam
                  </>
                )}
              </button>
            </div>
          )}

          {sourceType === 'stream' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter stream URL (YouTube, HLS, etc.)"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-fire-orange text-sm"
              />
              <button
                onClick={handleStreamSubmit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-fire-orange text-slate-900 rounded-lg font-semibold hover:bg-fire-red transition-colors"
              >
                <LinkIcon size={18} /> Connect Stream
              </button>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <AlertCircle size={14} /> Backend handles stream resolution via yt-dlp
              </p>
            </div>
          )}

          {/* Detection Button */}
          <button
            onClick={() => setDetectionActive(!detectionActive)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              detectionActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
            }`}
          >
            {detectionActive ? (
              <>
                <Square size={18} /> Stop Detection
              </>
            ) : (
              <>
                <AlertCircle size={18} /> Start Detection
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
        {sourceType === 'stream' && (
          <p>💡 YouTube & public streams are processed server-side for resolution detection</p>
        )}
        {sourceType === 'webcam' && isWebcamActive && (
          <p className="text-green-400">✓ Webcam active and ready for detection</p>
        )}
      </div>

      {/* Hidden file input */}
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
