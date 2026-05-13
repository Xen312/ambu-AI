import { useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, ShieldAlert } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import { io } from 'socket.io-client';
import { useSimulationStore } from './store/useSimulationStore';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL;

export const socket = io(
  SOCKET_URL,
  {
    transports: [
      "websocket",
      "polling"
    ],

    reconnection: true,

    reconnectionAttempts: 10,

    reconnectionDelay: 1000,
  }
);

function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { state, isConnected } = useSimulationStore();
  
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans flex flex-col uppercase tracking-wide text-sm">
      <header className="border-b border-slate-800 bg-slate-950 flex items-center h-16 px-6 shrink-0 justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <h1 className="font-bold text-slate-100 tracking-wider">Ambulance Priority Enforcement</h1>
          {state?.isActive && (
            <span className="ml-4 px-2.5 py-1 rounded-sm bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              EMERGENCY ACTIVE
            </span>
          )}
        </div>
        
        <nav className="flex items-center gap-6">
          <Link to="/" className={`px-2 py-1 ${pathname === '/' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>Dashboard</Link>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col p-6 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { updateState, setConnected } = useSimulationStore();

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('simulation:update', (data) => updateState(data));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('simulation:update');
    };
  }, [updateState, setConnected]);

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard socket={socket} />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
