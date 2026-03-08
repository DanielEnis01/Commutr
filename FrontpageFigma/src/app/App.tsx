import { PermitCard } from './components/PermitCard';

const permits = [
  {
    id: 'green',
    name: 'Green',
    color: '#10b981',
    description: 'Outer lots',
    garageAccess: false
  },
  {
    id: 'gold',
    name: 'Gold',
    color: '#f59e0b',
    description: 'Central + garages',
    garageAccess: true
  },
  {
    id: 'orange',
    name: 'Orange',
    color: '#f97316',
    description: 'Premium spots',
    garageAccess: true
  },
  {
    id: 'evening',
    name: 'Evening',
    color: '#ef4444',
    description: 'After 5 PM',
    garageAccess: true
  }
];

export default function App() {
  const handlePermitSelect = (permitId: string) => {
    console.log('Selected permit:', permitId);
    // Navigate to map view with selected permit
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ 
        background: 'linear-gradient(135deg, #0d0f1a 0%, #07080f 50%, #0a0c15 100%)'
      }}
    >
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-8xl font-bold tracking-tight mb-4">
          <span style={{ color: 'rgba(255, 255, 255, 1.0)' }}>commut</span>
          <span 
            style={{
              color: '#5ee7ff',
              textShadow: '0 0 60px rgba(94, 231, 255, 0.6), 0 0 100px rgba(94, 231, 255, 0.3)'
            }}
          >
            .r
          </span>
        </h1>
        <div 
          className="text-sm tracking-widest uppercase"
          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
        >
          <span style={{ color: 'rgba(94, 231, 255, 0.6)' }}>—</span> select permit to begin <span style={{ color: 'rgba(94, 231, 255, 0.6)' }}>—</span>
        </div>
      </div>

      {/* Permits Grid */}
      <div className="flex gap-4 max-w-4xl w-full overflow-x-auto pb-2">
        {permits.map((permit) => (
          <PermitCard
            key={permit.id}
            name={permit.name}
            color={permit.color}
            description={permit.description}
            garageAccess={permit.garageAccess}
            onSelect={() => handlePermitSelect(permit.id)}
          />
        ))}
      </div>
    </div>
  );
}