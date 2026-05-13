import { Play, Square, Settings2, RotateCcw, ActivitySquare, AlertTriangle, Route } from 'lucide-react';
import LiveMap from '../components/map/LiveMap';
import { useSimulationStore } from '../store/useSimulationStore';
import { Socket } from 'socket.io-client';
import { useState, useEffect } from 'react';

export default function Dashboard({ socket }: { socket: Socket }) {
  const { state, isConnected } = useSimulationStore();
  const [routeOptions, setRouteOptions] = useState<{id: number, name: string}[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  useEffect(() => {
    fetch(
    `${import.meta.env.VITE_API_URL}/api/simulation/routes`
  )
      .then(res => res.json())
      .then(data => {
        setRouteOptions(data);
      })
      .catch(console.error);
  }, []);

  const API_URL =
  import.meta.env.VITE_API_URL;

  const handleStart = () =>
    fetch(
      `${API_URL}/api/simulation/start`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          routeIndex: selectedRouteIndex
        })
      }
    );

  const handlePause = () =>
    fetch(
      `${API_URL}/api/simulation/pause`,
      {
        method: 'POST'
      }
    );

  const handleResume = () =>
    fetch(
      `${API_URL}/api/simulation/resume`,
      {
        method: 'POST'
      }
    );

  const handleReset = () =>
    fetch(
      `${API_URL}/api/simulation/reset`,
      {
        method: 'POST'
      }
    );

  return (
    <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
      
      {/* Left Column: Map */}
      <div className="col-span-8 flex flex-col gap-4">
        <div className="flex-1 min-h-0 bg-slate-900 rounded-xl border border-slate-800 p-2 relative shadow-2xl">
          <LiveMap />

          {!isConnected && (
            <div className="absolute inset-0 z-[500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-red-400 font-mono text-sm tracking-widest">CONNECTING TO SYSTEM...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Control Panel */}
        <div className="h-20 shrink-0 bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 text-xs tracking-widest font-bold">SYSTEM CONTROLS</span>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state?.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-400 font-mono">
                {state?.isActive ? 'SIMULATION RUNNING' : 'SYSTEM IDLE'}
              </span>
            </div>
            
            <div className="h-4 w-px bg-slate-700" />
            <select
              value={selectedRouteIndex}
              onChange={(e) => setSelectedRouteIndex(Number(e.target.value))}
              disabled={state?.isActive || (state?.ambulance?.progress > 0 && state?.ambulance?.progress < 1)}
              className="bg-slate-800 text-slate-300 text-xs font-mono px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-slate-500 disabled:opacity-50"
            >
              {routeOptions.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3">
            {!state?.isActive ? (
              <button 
                onClick={state?.ambulance?.progress > 0 && state?.ambulance?.progress < 1 ? handleResume : handleStart}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded font-bold text-xs tracking-widest transition-colors"
              >
                <Play className="w-4 h-4" />
                {state?.ambulance?.progress > 0 && state?.ambulance?.progress < 1 ? 'RESUME SIMULATION' : 'START SIMULATION'}
              </button>
            ) : (
              <button 
                onClick={handlePause}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded font-bold text-xs tracking-widest transition-colors"
              >
                <Square className="w-4 h-4" />
                PAUSE
              </button>
            )}
            
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-5 py-2 rounded font-bold text-xs tracking-widest transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Status Panels */}
      <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Ambulance Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-slate-400 border-b border-slate-800 pb-3">
            <ActivitySquare className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs tracking-widest font-bold text-slate-300">AMBULANCE STATUS</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">SPEED (KM/H)</span>
              <span className="text-2xl font-mono text-white">{state?.ambulance?.speed || 0}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">ETA</span>
              <span className="text-xl font-mono text-white mt-1">{state?.ambulance?.etaDisplay || '--'}</span>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-[10px] text-slate-500">ROUTE COMPLETION BAR</span>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden flex items-center">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(state?.ambulance?.progress || 0) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Obstruction Details */}
        <div className={`border rounded-xl p-5 flex flex-col gap-4 transition-colors ${state?.obstruction?.active ? 'bg-red-950/20 border-red-500/50' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex items-center gap-3 text-slate-400 border-b border-slate-800 pb-3">
            <AlertTriangle className={`w-4 h-4 ${state?.obstruction?.active ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
            <h3 className="text-xs tracking-widest font-bold text-slate-300">OBSTRUCTION DETECTED</h3>
          </div>
          
          {state?.obstruction?.active ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-xs text-slate-400 font-mono">SEVERITY / RISK</span>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 uppercase`}>
                    {state.obstruction.severity}
                  </span>
                  <span className="text-[10px] text-amber-500 uppercase font-mono">{state.obstruction.riskLevel}</span>
                </div>
              </div>
              {state.obstruction.vehiclePlate && (
                 <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded border border-slate-800">
                   <span className="text-[10px] text-slate-500">DETECTED VEHICLE</span>
                   <span className="text-xs font-mono text-slate-200 tracking-wider bg-slate-800 px-2 rounded-sm border border-slate-700">{state.obstruction.vehiclePlate}</span>
                 </div>
              )}
              <div className="text-sm font-mono text-slate-300 mt-1">
                <p>Location: [{state.obstruction.location?.[0].toFixed(4)}, {state.obstruction.location?.[1].toFixed(4)}]</p>
                <p>Clearing in: {state.obstruction.durationSecs}s</p>
              </div>
            </div>
          ) : (
             <div className="flex items-center justify-center h-20 text-slate-600 text-xs font-mono">
               NO ACTIVE OBSTRUCTIONS
             </div>
          )}
        </div>

        {/* AI Agent Workflow */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3 text-slate-400">
              <Route className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs tracking-widest font-bold text-slate-300">N8N AI AGENT DECISION</h3>
            </div>
            {state?.aiResult && (
               <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded border border-emerald-500/30">
                 WORKFLOW TRIGGERED
               </span>
            )}
          </div>
          
          {state?.aiResult ? (
            <div className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500">RECOMMENDED ACTION</span>
                <span className="text-emerald-400 p-2 bg-slate-950 rounded border border-emerald-500/20">
                  {state.aiResult.recommendedAction || state.aiResult.action || 'Unknown'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-950 rounded border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">CORRIDOR</span>
                  <span className={state.aiResult.corridorRequired ? 'text-emerald-400' : 'text-slate-400'}>
                    {state.aiResult.corridorRequired ? 'REQUIRED' : 'NOT REQUIRED'}
                  </span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">ESCALATION</span>
                  <span className={state.aiResult.escalationRequired ? 'text-red-400' : 'text-slate-400'}>
                    {state.aiResult.escalationRequired ? 'REQUIRED' : 'NOT REQUIRED'}
                  </span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] text-slate-500">AUTHORITY NOTIFICATION</span>
                  <span className={state.aiResult.escalationRequired ? 'text-amber-400' : 'text-slate-400'}>
                    {state.aiResult.escalationRequired ? 'DISPATCHED ALERTS TO LAW ENFORCEMENT' : 'ON STANDBY'}
                  </span>
                </div>
                {state.aiResult.flaggedPlate && (
                  <div className="p-2 bg-slate-900 rounded border border-red-500/30 flex flex-col gap-1 col-span-2">
                    <span className="text-[10px] text-red-500">FLAGGED VEHICLE (POTENTIAL INTENTIONAL BLOCK)</span>
                    <span className="text-red-400 font-bold text-sm">{state.aiResult.flaggedPlate}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-slate-500">CONFIDENCE SCORE</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500"
                      style={{ width: `${state.aiResult.confidence}%` }}
                    />
                  </div>
                  <span className="text-slate-300">{state.aiResult.confidence}%</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <span className="text-slate-500">SUMMARY</span>
                <span className="text-slate-400 leading-relaxed italic">
                  "{state.aiResult.summary}"
                </span>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center flex-1 text-slate-600 text-xs font-mono gap-2 min-h-[150px]">
               <span>WAITING FOR EVENTS...</span>
               <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
             </div>
          )}
        </div>
        
      </div>
      
    </div>
  );
}
