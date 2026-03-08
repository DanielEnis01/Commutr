import { MapPin, Clock, Navigation, X } from 'lucide-react';

export function LocationPanel({
  locationName = "North Parking Garage",
  address = "123 Main Street",
  estimatedTime = 8,
  distance = 2.3,
  availableSpots = 47,
  onStartRoute,
  onCancel
}) {
  return (
    <div 
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(13, 15, 26, 0.98)',
        borderColor: 'rgba(94, 231, 255, 0.12)',
        borderWidth: '1px 1px 0 1px',
        borderStyle: 'solid',
        borderTopLeftRadius: '1rem',
        borderTopRightRadius: '1rem',
        padding: '1rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(12px)',
        color: 'white',
        fontFamily: 'inherit'
      }}
    >
      {/* Handle bar with close button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', position: 'relative' }}>
        <div style={{ width: '2.5rem', height: '0.25rem', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
        <button 
          onClick={onCancel}
          style={{ position: 'absolute', right: 0, top: '-0.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Location info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', flexShrink: 0, backgroundColor: 'rgba(94, 231, 255, 0.10)' }}>
          <MapPin size={16} style={{ color: '#5ee7ff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontWeight: 'bold', margin: '0 0 0.125rem 0', fontSize: '1rem', color: 'rgba(255, 255, 255, 1.0)' }}>
            {locationName}
          </h2>
          <p style={{ fontSize: '0.75rem', margin: '0 0 0.375rem 0', color: 'rgba(255, 255, 255, 0.75)' }}>
            {address}
          </p>
          {/* Availability badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', backgroundColor: 'rgba(78, 255, 160, 0.10)' }}>
            <div style={{ width: '0.25rem', height: '0.25rem', borderRadius: '9999px', backgroundColor: '#4effa0' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#4effa0' }}>
              {availableSpots > 0 ? `${availableSpots} spots` : 'Full'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {/* Time */}
        <div style={{ flex: 1, borderRadius: '0.5rem', padding: '0.625rem', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: '1px', borderStyle: 'solid' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
            <Clock size={14} style={{ color: '#5ee7ff' }} />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em', color: 'rgba(255, 255, 255, 0.35)' }}>
              Time
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1.0)' }}>
            {estimatedTime} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'rgba(255, 255, 255, 0.75)' }}>min</span>
          </div>
        </div>

        {/* Distance */}
        <div style={{ flex: 1, borderRadius: '0.5rem', padding: '0.625rem', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: '1px', borderStyle: 'solid' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
            <Navigation size={14} style={{ color: '#5ee7ff' }} />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em', color: 'rgba(255, 255, 255, 0.35)' }}>
              Distance
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1.0)' }}>
            {distance} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'rgba(255, 255, 255, 0.75)' }}>mi</span>
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStartRoute}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '0.75rem',
          fontWeight: 'bold',
          transition: 'all 0.2s',
          backgroundColor: '#5ee7ff',
          color: '#07080f',
          border: 'none',
          boxShadow: '0 0 30px rgba(94, 231, 255, 0.4)',
          cursor: 'pointer'
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
