import { useEffect, useRef } from 'react'
import { useIncidentStore } from '../store'
import { WebSocketMessage } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/live'
const RECONNECT_INTERVAL = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addOrUpdateIncident = useIncidentStore((s) => s.addOrUpdateIncident)
  const setWSConnected = useIncidentStore((s) => s.setWSConnected)
  const setLastAlert = useIncidentStore((s) => s.setLastAlert)

  useEffect(() => {
    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL)

        wsRef.current.onopen = () => {
          console.log('WebSocket connected')
          setWSConnected(true)
          reconnectAttempts.current = 0
        }

        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            console.log('Received message:', message)
        
            switch (message.type) {
              case 'satellite_scan':
                useIncidentStore
                  .getState()
                  .setSatelliteScan(message.data)
                break
        
              default:
                addOrUpdateIncident(message)
                break
            }
        
            if (message.type === 'detection_new') {
              setLastAlert(message.incident_id)
              setTimeout(() => setLastAlert(null), 5000)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error)
          setWSConnected(false)
        }

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected')
          setWSConnected(false)

          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts.current)
            reconnectAttempts.current += 1
            console.log(
              `Attempting reconnect (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`
            )
            reconnectTimeoutRef.current = setTimeout(connect, delay)
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        setWSConnected(false)
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return wsRef
}