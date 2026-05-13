import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulationStore } from '../../store/useSimulationStore';

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const obstructionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function LiveMap() {
  const { state } = useSimulationStore();
  const defaultCenter: [number, number] = [24.8170, 93.9368];

  const center = state?.ambulance?.location || defaultCenter;

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
      <MapContainer
        center={defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} // Fake dark mode map
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {state?.isActive && state.route && (
          <Polyline positions={state.route} color="#ef4444" weight={5} opacity={0.7} />
        )}

        {state?.isActive && state.ambulance && (
          <Marker position={state.ambulance.location} icon={ambulanceIcon} zIndexOffset={100} />
        )}

        {state?.isActive && state.obstruction?.active && state.obstruction.location && (
          <Marker position={state.obstruction.location} icon={obstructionIcon} zIndexOffset={50} />
        )}
        
        {state?.isActive && <MapRecenter center={center} />}
      </MapContainer>
      
      {/* Overlay Status */}
      <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 border border-slate-700 p-3 rounded shadow-lg backdrop-blur text-xs flex flex-col gap-1">
        <span className="text-slate-400">AMB ID</span>
        <span className="text-white font-mono text-base">{state?.ambulance?.id || 'IDLE'}</span>
      </div>
      
      <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 border border-slate-700 p-3 rounded shadow-lg backdrop-blur text-xs flex flex-col gap-2 text-right">
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-400">SPEED</span>
          <span className="text-white font-mono text-base">{state?.ambulance?.speed || 0} KM/H</span>
        </div>
        <div className="flex flex-col gap-0.5 pt-2 border-t border-slate-700/50">
          <span className="text-slate-400">ETA</span>
          <span className="text-white font-mono text-base">{state?.ambulance?.etaDisplay || '--'}</span>
        </div>
      </div>
    </div>
  );
}
