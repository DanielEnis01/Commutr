import { MapPin, Clock, Navigation } from 'lucide-react';

interface LocationPanelProps {
  locationName?: string;
  address?: string;
  estimatedTime?: number; // in minutes
  distance?: number; // in miles
  availableSpots?: number;
  onStartRoute?: () => void;
}

export function LocationPanel({
  locationName = "North Parking Garage",
  address = "123 Main Street",
  estimatedTime = 8,
  distance = 2.3,
  availableSpots = 47,
  onStartRoute
}: LocationPanelProps) {
  return (
    <div 
      className="rounded-t-2xl p-4 shadow-2xl backdrop-blur-md"
      style={{
        background: 'rgba(13, 15, 26, 0.98)',
        borderColor: 'rgba(94, 231, 255, 0.12)',
        borderWidth: '1px 1px 0 1px'
      }}
    >
      {/* Handle bar */}
      <div className="flex justify-center mb-3">
        <div 
          className="w-10 h-1 rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
        />
      </div>

      {/* Location info */}
      <div className="flex items-start gap-2.5 mb-3">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: 'rgba(94, 231, 255, 0.10)' }}
        >
          <MapPin className="w-4 h-4" style={{ color: '#5ee7ff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 
            className="font-bold mb-0.5 text-base"
            style={{ color: 'rgba(255, 255, 255, 1.0)' }}
          >
            {locationName}
          </h2>
          <p 
            className="text-xs mb-1.5"
            style={{ color: 'rgba(255, 255, 255, 0.75)' }}
          >
            {address}
          </p>
          {/* Availability badge */}
          <div 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(78, 255, 160, 0.10)' }}
          >
            <div 
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: '#4effa0' }}
            />
            <span 
              className="text-xs font-medium"
              style={{ color: '#4effa0' }}
            >
              {availableSpots} spots
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 mb-3">
        {/* Time */}
        <div 
          className="flex-1 rounded-lg p-2.5"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: '1px'
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-3.5 h-3.5" style={{ color: '#5ee7ff' }} />
            <span 
              className="text-xs uppercase tracking-wide"
              style={{ color: 'rgba(255, 255, 255, 0.35)' }}
            >
              Time
            </span>
          </div>
          <div 
            className="text-xl font-bold"
            style={{ color: 'rgba(255, 255, 255, 1.0)' }}
          >
            {estimatedTime} <span className="text-sm font-normal" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>min</span>
          </div>
        </div>

        {/* Distance */}
        <div 
          className="flex-1 rounded-lg p-2.5"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: '1px'
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Navigation className="w-3.5 h-3.5" style={{ color: '#5ee7ff' }} />
            <span 
              className="text-xs uppercase tracking-wide"
              style={{ color: 'rgba(255, 255, 255, 0.35)' }}
            >
              Distance
            </span>
          </div>
          <div 
            className="text-xl font-bold"
            style={{ color: 'rgba(255, 255, 255, 1.0)' }}
          >
            {distance.toFixed(1)} <span className="text-sm font-normal" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>mi</span>
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStartRoute}
        className="w-full py-3 rounded-xl font-bold transition-all active:scale-98"
        style={{
          backgroundColor: '#5ee7ff',
          color: '#07080f',
          boxShadow: '0 0 30px rgba(94, 231, 255, 0.4)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#7aecff';
          e.currentTarget.style.boxShadow = '0 0 40px rgba(94, 231, 255, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#5ee7ff';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(94, 231, 255, 0.4)';
        }}
      >
        Start Navigation
      </button>
    </div>
  );
}