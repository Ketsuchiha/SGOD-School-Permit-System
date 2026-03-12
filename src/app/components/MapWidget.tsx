import { School } from '../data/mockData';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

interface MapWidgetProps {
  schools: School[];
  selectedSchool?: School;
  onSelectSchool: (school: School) => void;
}

export function MapWidget({ schools, selectedSchool, onSelectSchool }: MapWidgetProps) {
  const statusColor = (status: School['status']) => {
    switch (status) {
      case 'operational':
        return '#10b981';
      case 'renewal':
        return '#f59e0b';
      case 'not-operational':
        return '#f43f5e';
    }
  };

  return (
    <div className="relative">
      {/* Glass Container */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
        {/* Map Header */}
        <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Cabuyao City School Locations</h3>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              aria-label="Zoom In"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-slate-400" />
            </button>
            <button 
              type="button"
              aria-label="Zoom Out"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-slate-400" />
            </button>
            <button 
              type="button"
              aria-label="Maximize Map"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="relative h-96 overflow-hidden">
          <MapContainer center={[14.2722, 121.1239]} zoom={12} className="h-96 w-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {schools.map((school) => {
              const isSelected = selectedSchool?.id === school.id;
              const color = statusColor(school.status);

              return (
                <CircleMarker
                  key={school.id}
                  center={[school.lat, school.lng]}
                  radius={isSelected ? 10 : 7}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
                  eventHandlers={{ click: () => onSelectSchool(school) }}
                >
                  <Popup>
                    <div className="text-sm font-semibold">{school.name}</div>
                    <div className="text-xs">{school.permitNumber}</div>
                    <div className="text-xs">{school.address}</div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
