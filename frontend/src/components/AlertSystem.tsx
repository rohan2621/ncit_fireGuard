import React, { useState, useEffect } from 'react'
import { useIncidentStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface Alert {
  id: string
  type: 'detection' | 'risk' | 'impact'
  message: string
  createdAt: Date
}

export const AlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const lastAlert = useIncidentStore((state) => state.lastAlert)

  // Add alert when new detection arrives
  useEffect(() => {
    if (lastAlert) {
      const newAlert: Alert = {
        id: Date.now().toString(),
        type: 'detection',
        message: `New fire detection: ${lastAlert.slice(0, 8).toUpperCase()}`,
        createdAt: new Date(),
      }
      setAlerts((prev) => [newAlert, ...prev])

      // Play sound (optional - currently just visual)
      playAlertSound()

      // Auto-remove after 6 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id))
      }, 6000)
    }
  }, [lastAlert])

  const playAlertSound = () => {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.connect(gain)
      gain.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gain.gain.setValueAtTime(0.1, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn('Could not play alert sound:', error)
    }
  }

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 400, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 400, y: -20 }}
            className="pointer-events-auto mb-3"
          >
            <div className="bg-red-900 border border-red-700 rounded-lg shadow-lg overflow-hidden max-w-sm">
              <div className="flex items-start gap-3 p-4">
                <div className="flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-200">
                    {alert.type === 'detection' && '🔥 Fire Detection Alert'}
                    {alert.type === 'risk' && '⚠️ High Risk Alert'}
                    {alert.type === 'impact' && '💔 Impact Update'}
                  </h3>
                  <p className="text-sm text-red-300 mt-1">{alert.message}</p>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 6 }}
                className="h-1 bg-red-500"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
