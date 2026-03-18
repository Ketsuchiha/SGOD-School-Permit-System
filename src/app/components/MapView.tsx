import { useMemo, useState } from 'react';
import { School, getStatusColor, getStatusLabel } from '../data/mockData';
import { MapPin, Navigation, Search, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useSchools } from '../contexts/SchoolContext';
import { Sidebar } from './Sidebar';
import { SchoolDetailModal } from './SchoolDetailModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
              <MapContainer center={[14.2722, 121.1239]} zoom={12} className="h-[600px] w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {filteredSchools.map((school) => {
                  const isSelected = selectedSchool?.id === school.id;
                  const color = statusColor(school.status);

                  return (
                    <CircleMarker
                      key={school.id}
                      center={[school.lat, school.lng]}
                      radius={isSelected ? 11 : 8}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
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
                    </CircleMarker>
                  );
                })}
              </MapContainer>
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
                <button 
                  type="button"
                  aria-label="Reset View"
                  className="w-10 h-10 bg-slate-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
                >
                  <Navigation className="w-5 h-5 text-white" />
                </button>
              </div>
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
