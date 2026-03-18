import { useMemo, useState } from 'react';
import { School, getStatusColor, getStatusLabel } from '../data/mockData';
import { MapPin, Navigation, Search, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useSchools } from '../contexts/SchoolContext';
import { Sidebar } from './Sidebar';
import { SchoolDetailModal } from './SchoolDetailModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { LatLngBoundsExpression } from 'leaflet';

const CABUYAO_CENTER: [number, number] = [14.2722, 121.1239];

type PlottedSchool = {
  school: School;
  lat: number;
  lng: number;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isWithinPhilippinesBounds = (lat: number, lng: number) => {
  return lat >= 4 && lat <= 22 && lng >= 116 && lng <= 127;
};

const stableHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildPlottedSchools = (schools: School[]): PlottedSchool[] => {
  const base = schools.map((school) => {
    const lat = toFiniteNumber(school.lat);
    const lng = toFiniteNumber(school.lng);

    if (lat !== null && lng !== null && isWithinPhilippinesBounds(lat, lng)) {
      return { school, lat, lng };
    }

    const hash = stableHash(school.id || school.name || 'school');
    const offsetLat = ((hash % 13) - 6) * 0.00006;
    const offsetLng = (((Math.floor(hash / 13)) % 13) - 6) * 0.00006;

    return {
      school,
      lat: CABUYAO_CENTER[0] + offsetLat,
      lng: CABUYAO_CENTER[1] + offsetLng,
    };
  });

  const grouped = new Map<string, PlottedSchool[]>();
  base.forEach((entry) => {
    const key = `${entry.lat.toFixed(6)},${entry.lng.toFixed(6)}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(entry);
    grouped.set(key, bucket);
  });

  const spread: PlottedSchool[] = [];
  grouped.forEach((bucket) => {
    if (bucket.length === 1) {
      spread.push(bucket[0]);
      return;
    }

    const radius = 0.00014;
    bucket.forEach((entry, index) => {
      const angle = (index / bucket.length) * Math.PI * 2;
      spread.push({
        ...entry,
        lat: entry.lat + Math.sin(angle) * radius,
        lng: entry.lng + Math.cos(angle) * radius,
      });
    });
  });

  return spread;
};

function MapControls({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
      <button
        type="button"
        aria-label="Reset View"
        onClick={() => {
          if (bounds) {
            map.fitBounds(bounds, { padding: [30, 30] });
          } else {
            map.setView(CABUYAO_CENTER, 12);
          }
        }}
        className="w-10 h-10 bg-slate-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
      >
        <Navigation className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

export function MapView() {
  const navigate = useNavigate();
  const { activeSchools } = useSchools();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [filter, setFilter] = useState<'all' | 'operational' | 'renewal' | 'not-operational'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetail, setShowDetail] = useState(false);

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

  const filteredSchools = useMemo(() => {
    const byStatus = filter === 'all'
      ? activeSchools
      : activeSchools.filter((s: School) => s.status === filter);

    if (!searchQuery.trim()) return byStatus;
    const q = searchQuery.toLowerCase();
    return byStatus.filter((school) =>
      school.name.toLowerCase().includes(q)
      || school.barangay.toLowerCase().includes(q)
      || school.address.toLowerCase().includes(q)
      || school.permitNumber.toLowerCase().includes(q)
    );
  }, [activeSchools, filter, searchQuery]);

  const plottedSchools = useMemo(() => buildPlottedSchools(filteredSchools), [filteredSchools]);
  const plottedById = useMemo(() => {
    const map = new Map<string, PlottedSchool>();
    plottedSchools.forEach((entry) => map.set(entry.school.id, entry));
    return map;
  }, [plottedSchools]);
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (plottedSchools.length === 0) {
      return null;
    }
    return plottedSchools.map((entry) => [entry.lat, entry.lng] as [number, number]);
  }, [plottedSchools]);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 ml-20">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">Interactive School Map</h1>
        <p className="text-slate-400">Geographic view of all registered schools</p>
        <p className="text-xs text-slate-500 mt-1">Pins shown: {plottedSchools.length} / {filteredSchools.length} filtered schools</p>
      </div>

      {/* Controls Bar */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            aria-label="Search schools"
            placeholder="Search schools by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
          />
        </div>

        <Select value={filter} onValueChange={(value) => setFilter(value as School['status'] | 'all')}>
          <SelectTrigger aria-label="Filter by status" className="w-[210px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="renewal">Renewal</SelectItem>
            <SelectItem value="not-operational">Not Operational</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Map */}
        <div className="lg:col-span-2">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative h-[600px] overflow-hidden">
              <MapContainer center={CABUYAO_CENTER} zoom={12} className="h-[600px] w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {plottedSchools.map((entry) => {
                  const school = entry.school;
                  const isSelected = selectedSchool?.id === school.id;
                  const color = statusColor(school.status);

                  return [
                    <CircleMarker
                      key={`${school.id}-glow`}
                      center={[entry.lat, entry.lng]}
                      radius={isSelected ? 20 : 15}
                      pathOptions={{ color, fillColor: color, fillOpacity: isSelected ? 0.3 : 0.2, weight: 0 }}
                    />,
                    <CircleMarker
                      key={`${school.id}-pin`}
                      center={[entry.lat, entry.lng]}
                      radius={isSelected ? 10 : 8}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.95, weight: isSelected ? 3 : 2 }}
                      eventHandlers={{ click: () => setSelectedSchool(school) }}
                    >
                      <Popup>
                        <div className="text-sm font-semibold text-slate-900">{school.name}</div>
                        <div className="text-xs text-slate-600">{school.permitNumber}</div>
                        <div className="text-xs text-slate-600 mb-2">{school.address}</div>
                        <div className="text-xs">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            school.status === 'operational' ? 'bg-emerald-100 text-emerald-800' :
                            school.status === 'renewal' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {getStatusLabel(school.status)}
                          </span>
                        </div>
                      </Popup>
                    </CircleMarker>,
                  ];
                })}
                <MapControls bounds={bounds} />
              </MapContainer>
            </div>
          </div>
        </div>

        {/* School Details Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
            {selectedSchool ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{selectedSchool.name}</h3>
                  <p className="text-sm text-slate-400">{selectedSchool.permitNumber}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedSchool.status)}`}>
                        {getStatusLabel(selectedSchool.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Address</label>
                    <div className="text-white mt-1">{selectedSchool.address || 'No address recorded'}</div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Coordinates</label>
                    <div className="text-white mt-1 font-mono text-xs">
                      {(() => {
                        const plotted = plottedById.get(selectedSchool.id);
                        if (!plotted) {
                          return `${selectedSchool.lat.toFixed(6)}, ${selectedSchool.lng.toFixed(6)}`;
                        }
                        return `${plotted.lat.toFixed(6)}, ${plotted.lng.toFixed(6)}`;
                      })()}
                    </div>
                  </div>

                </div>

                <button 
                  type="button"
                  onClick={() => setShowDetail(true)}
                  className="w-full bg-gradient-to-r from-[#0C4DA2] to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                >
                  View Full Details
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Select a school marker to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      {showDetail && selectedSchool && (
        <SchoolDetailModal
          school={selectedSchool}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}
