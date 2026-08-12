import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface AttendanceEvent {
  id: string;
  employee_name: string;
  employee_id: string;
  event: string;
  time: string;
  device: string;
  location: string;
  coords: { lat: number | null; lng: number | null };
  face_image: string | null;
  alerts: {
    late: boolean;
    unusual: boolean;
  };
}

export const useAttendanceSocket = (token: string | null) => {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('attendance_sound_enabled') !== 'false';
  });

  const socketRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audioRef.current.volume = 0.4;
  }, []);

  useEffect(() => {
    localStorage.setItem('attendance_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  const connect = useCallback(() => {
    if (!token || socketRef.current?.readyState === WebSocket.OPEN) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const wsProtocol = apiBaseUrl.startsWith("https") ? "wss:" : "ws:";
    const host = apiBaseUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}//${host}/biometric/logs/ws/attendance-live?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to Attendance Live Feed');
    };

    socket.onmessage = (event) => {
      const data: AttendanceEvent = JSON.parse(event.data);
      
      if (!isPaused) {
        setEvents((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
        
        if (soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {
              // Ignore autoplay restriction errors
          });
        }

        if (data.alerts.late || data.alerts.unusual) {
          toast.warning(`${data.employee_name}: ${data.alerts.late ? 'Late Arrival' : 'Unusual Behavior'}`, {
            description: `At ${data.time} from ${data.device}`,
          });
        }
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from Attendance Live Feed. Retrying...');
      setTimeout(connect, 3000); // Reconnect logic
    };

    socketRef.current = socket;
  }, [token, isPaused, soundEnabled]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.close();
    };
  }, [connect]);

  const togglePause = () => setIsPaused(!isPaused);
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const clearFeed = () => setEvents([]);

  return {
    events,
    isConnected,
    isPaused,
    soundEnabled,
    togglePause,
    toggleSound,
    clearFeed
  };
};
