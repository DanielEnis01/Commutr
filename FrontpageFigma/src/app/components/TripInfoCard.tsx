import { Clock, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TripInfoCardProps {
  initialSeconds?: number;
  distance?: number;
  destination?: string;
}

export function TripInfoCard({
  initialSeconds = 1260, // 21 minutes default
  distance = 12.4,
  destination = "Downtown"
}: TripInfoCardProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatETA = (seconds: number) => {
    const now = new Date();
    const eta = new Date(now.getTime() + seconds * 1000);
    return eta.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div 
      className="rounded-2xl px-5 py-3 shadow-lg backdrop-blur-md w-full max-w-md"
      style={{
        background: 'rgba(13, 15, 26, 0.95)',
        borderColor: 'rgba(94, 231, 255, 0.12)',
        borderWidth: '1px'
      }}
    >
      {/* Top row - Destination and timer */}
      <div className="flex items-center justify-between gap-4 mb-2">
        {/* Destination */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#5ee7ff' }} />
          <div className="truncate">
            <div 
              className="font-medium truncate"
              style={{ color: 'rgba(255, 255, 255, 1.0)' }}
            >
              {destination}
            </div>
          </div>
        </div>

        {/* Main Timer */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" style={{ color: '#4effa0' }} />
          <div 
            className="text-3xl font-bold tabular-nums tracking-tight"
            style={{ 
              color: '#5ee7ff',
              textShadow: '0 0 20px rgba(94, 231, 255, 0.3)'
            }}
          >
            {formatTime(secondsRemaining)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="h-1 rounded-full overflow-hidden mb-2"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
      >
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ 
            width: `${Math.max(0, 100 - (secondsRemaining / initialSeconds) * 100)}%`,
            backgroundColor: '#4effa0',
            boxShadow: '0 0 10px rgba(78, 255, 160, 0.5)'
          }}
        />
      </div>

      {/* Bottom row - Stats */}
      <div className="flex items-center justify-between gap-4">
        {/* Distance */}
        <div className="flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5" style={{ color: '#5ee7ff' }} />
          <div className="flex items-baseline gap-1">
            <span 
              className="font-bold tabular-nums"
              style={{ color: 'rgba(255, 255, 255, 1.0)' }}
            >
              {distance.toFixed(1)}
            </span>
            <span 
              className="text-xs"
              style={{ color: 'rgba(255, 255, 255, 0.75)' }}
            >
              mi
            </span>
          </div>
        </div>

        {/* Divider */}
        <div 
          className="w-px h-4"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
        />

        {/* ETA */}
        <div className="flex items-center gap-1.5">
          <span 
            className="text-xs uppercase tracking-wide"
            style={{ color: 'rgba(255, 255, 255, 0.35)' }}
          >
            ETA
          </span>
          <span 
            className="font-bold tabular-nums"
            style={{ color: 'rgba(255, 255, 255, 1.0)' }}
          >
            {formatETA(secondsRemaining)}
          </span>
        </div>

        {/* Divider */}
        <div 
          className="w-px h-4"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
        />

        {/* Active indicator */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <div 
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#4effa0' }}
            />
            <div 
              className="absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: '#4effa0' }}
            />
          </div>
          <span 
            className="text-xs"
            style={{ color: 'rgba(255, 255, 255, 0.35)' }}
          >
            Active
          </span>
        </div>
      </div>
    </div>
  );
}