interface PermitCardProps {
  name: string;
  color: string;
  description: string;
  garageAccess: boolean;
  onSelect: () => void;
}

export function PermitCard({
  name,
  color,
  description,
  garageAccess,
  onSelect
}: PermitCardProps) {
  return (
    <button
      onClick={onSelect}
      className="rounded-2xl p-6 text-center transition-all duration-300 active:scale-95 flex-1 min-w-0 backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(13, 15, 26, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: '1px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = color + '30';
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 0 40px ${color}50, 0 0 80px ${color}30`;
        e.currentTarget.style.transform = 'translateY(-8px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(13, 15, 26, 0.6)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Name */}
      <div 
        className="font-bold text-xl mb-2"
        style={{ color: 'rgba(255, 255, 255, 1.0)' }}
      >
        {name}
      </div>

      {/* Description */}
      <div 
        className="text-sm mb-4"
        style={{ color: 'rgba(255, 255, 255, 0.75)' }}
      >
        {description}
      </div>

      {/* Garage badge */}
      <div 
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: garageAccess 
            ? 'rgba(78, 255, 160, 0.15)' 
            : 'rgba(255, 255, 255, 0.08)',
          color: garageAccess ? '#4effa0' : 'rgba(255, 255, 255, 0.4)'
        }}
      >
        {garageAccess ? '✓' : '✕'} Garage
      </div>
    </button>
  );
}