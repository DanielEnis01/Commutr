import { MapPin, Navigation, X } from 'lucide-react';

export function TripInfoCard({
  instruction = "Calculating...",
  progress = 0,
  initialSeconds = 1260,
  distance = 12.4,
  destination = "Downtown",
  onStop
}) {
  const formatETA = (seconds) => {
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
      style={{
        position: 'absolute',
        top: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        width: '90%',
        maxWidth: '28rem',
        background: 'rgba(13, 15, 26, 0.95)',
        borderColor: 'rgba(94, 231, 255, 0.12)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '1rem',
        padding: '0.75rem 1.25rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(12px)',
        color: 'white',
        fontFamily: 'inherit'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <MapPin size={16} style={{ color: '#5ee7ff', flexShrink: 0 }} />
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 1.0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {destination}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 2, justifyContent: 'flex-end' }}>
          <Navigation size={18} style={{ color: '#4effa0', flexShrink: 0 }} />
          <div 
            style={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              color: '#5ee7ff',
              textShadow: '0 0 15px rgba(94, 231, 255, 0.2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'right'
            }}
          >
            {instruction}
          </div>
          <button 
            onClick={onStop}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'rgba(255,255,255,0.4)', 
              cursor: 'pointer',
              marginLeft: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div 
        style={{ 
          height: '0.25rem', 
          borderRadius: '9999px', 
          overflow: 'hidden', 
          marginBottom: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.06)' 
        }}
      >
        <div 
          style={{ 
            height: '100%', 
            borderRadius: '9999px', 
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: '#4effa0',
            boxShadow: '0 0 10px rgba(78, 255, 160, 0.5)'
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Navigation size={14} style={{ color: '#5ee7ff' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            <span style={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', color: 'rgba(255, 255, 255, 1.0)' }}>
              {distance}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.75)' }}>
              mi
            </span>
          </div>
        </div>

        <div style={{ width: '1px', height: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em', color: 'rgba(255, 255, 255, 0.35)' }}>
            ETA
          </span>
          <span style={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', color: 'rgba(255, 255, 255, 1.0)' }}>
            {formatETA(initialSeconds)}
          </span>
        </div>

        <div style={{ width: '1px', height: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '9999px', backgroundColor: '#4effa0' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.35)' }}>
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
