import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  MapPin, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Search,
  User,
  Clock,
  LayoutGrid,
  Trash2,
  Maximize2
} from 'lucide-react';
import { useAttendanceSocket } from '@/hooks/useAttendanceSocket';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const LiveAttendanceDashboard = () => {
  const token = localStorage.getItem('token');
  const { 
    events, 
    isConnected, 
    isPaused, 
    soundEnabled, 
    togglePause, 
    toggleSound,
    clearFeed
  } = useAttendanceSocket(token);

  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const filteredEvents = useMemo(() => {
    return events.filter(e => 
      e.employee_name.toLowerCase().includes(search.toLowerCase()) || 
      e.device.toLowerCase().includes(search.toLowerCase())
    );
  }, [events, search]);

  const alerts = events.filter(e => e.alerts.late || e.alerts.unusual);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 min-h-screen pb-20">
      <PageHeader 
        icon={Activity}
        title="Live Attendance Control Center"
        subtitle="Real-time biometric monitoring, geospatial tracking, and proactive alerts."
        actions={
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                    {isConnected ? 'SYSTEM LIVE' : 'DISCONNECTED'}
                </span>
             </div>
             
             <TooltipProvider>
                <div className="flex gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button 
                                onClick={toggleSound}
                                className={`p-2.5 rounded-xl border transition-all ${soundEnabled ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-slate-500'}`}
                            >
                                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs font-bold font-display uppercase tracking-widest">{soundEnabled ? 'Mute' : 'Unmute'}</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button 
                                onClick={togglePause}
                                className={`p-2.5 rounded-xl border transition-all ${isPaused ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-white/5 border-white/10 text-slate-500'}`}
                            >
                                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs font-bold font-display uppercase tracking-widest">{isPaused ? 'Resume Feed' : 'Freeze Feed'}</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button 
                                onClick={clearFeed}
                                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs font-bold font-display uppercase tracking-widest">Clear Feed</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
             </TooltipProvider>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-280px)]">
        {/* Left: Live Events Feed */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                    type="text"
                    placeholder="Search employee or device..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                />
            </div>

            <Card className="flex-1 bg-white/[0.02] border-white/10 overflow-hidden flex flex-col rounded-3xl">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Live Event Stream
                    </h3>
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-bold uppercase tracking-widest">
                        {events.length} ACTIVE
                    </Badge>
                </div>

                <ScrollArea className="flex-1 px-4 py-2">
                    <div className="space-y-4 py-4">
                        <AnimatePresence initial={false}>
                            {filteredEvents.map((event) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -30, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                                    exit={{ opacity: 0, x: 30, height: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    onClick={() => setSelectedEvent(event)}
                                    className={`group relative p-4 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.08] hover:border-white/20 transition-all ${event.alerts.late || event.alerts.unusual ? 'ring-1 ring-red-500/30 bg-red-400/5' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative shrink-0">
                                            <Avatar className="w-12 h-12 rounded-xl border border-white/10">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${event.employee_id}`} />
                                                <AvatarFallback><User size={16}/></AvatarFallback>
                                            </Avatar>
                                            {event.face_image && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-lg border-2 border-slate-900 flex items-center justify-center">
                                                    <Maximize2 size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                                                    {event.employee_name}
                                                </h4>
                                                <span className="text-[10px] font-mono text-slate-500">{event.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={`${event.event === 'IN' || event.event === 'PUNCH' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} border-none text-[10px] px-1.5 font-black flex items-center gap-1`}>
                                                    <div className={`w-1 h-1 rounded-full ${event.event === 'IN' || event.event === 'PUNCH' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                    {event.event}
                                                </Badge>
                                                <span className="text-[10px] text-slate-500 truncate">{event.device}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(event.alerts.late || event.alerts.unusual) && (
                                        <div className="absolute top-2 right-2">
                                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {filteredEvents.length === 0 && !isPaused && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <Activity className="w-12 h-12 mb-4 opacity-10" />
                                <p className="text-sm font-bold uppercase tracking-widest">Listening for punches...</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </Card>
        </div>

        {/* Right: Map & Alerts */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* Map View */}
                <Card className="md:col-span-1 bg-white/[0.02] border-white/10 rounded-3xl overflow-hidden relative group">
                    <div className="absolute top-5 left-5 z-20">
                        <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white font-bold tracking-widest text-[10px] px-3 py-1.5 flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-primary" />
                            INTERACTIVE COMMAND MAP
                        </Badge>
                    </div>

                    {/* Precise Grid Based Map Visualization */}
                    <div className="w-full h-full bg-slate-900/50 flex items-center justify-center relative p-10 overflow-hidden">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" 
                             style={{backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px'}} />
                        
                        <div className="relative w-full h-full border border-white/5 bg-white/5 rounded-2xl flex items-center justify-center">
                            {/* Simulated Device Hotspots */}
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="absolute top-1/4 left-1/4 group/pin"
                            >
                                <div className="p-2 bg-primary/20 rounded-full cursor-pointer hover:bg-primary transition-all">
                                    <MapPin className="w-6 h-6 text-primary group-hover/pin:text-white" />
                                </div>
                                <div className="absolute -top-10 -left-1/2 hidden group-hover/pin:block bg-black/80 p-2 rounded-lg text-white border border-white/10">
                                    <p className="text-[10px] font-bold uppercase whitespace-nowrap">Main Gate Device</p>
                                </div>
                            </motion.div>

                            <motion.div 
                                className="absolute bottom-1/3 right-1/4 group/pin"
                            >
                                <div className="p-2 bg-emerald-500/20 rounded-full cursor-pointer hover:bg-emerald-500 transition-all">
                                    <MapPin className="w-6 h-6 text-emerald-500 group-hover/pin:text-white" />
                                </div>
                                <div className="absolute -top-10 -left-1/2 hidden group-hover/pin:block bg-black/80 p-2 rounded-lg text-white border border-white/10">
                                    <p className="text-[10px] font-bold uppercase whitespace-nowrap">HR Office Terminal</p>
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {filteredEvents[0] && (
                                    <motion.div
                                        key={filteredEvents[0].id}
                                        initial={{ scale: 2, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                    >
                                        <div className="w-20 h-20 bg-primary/10 rounded-full animate-ping flex items-center justify-center border border-primary/20" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="text-center px-8 z-10 pointer-events-none">
                                <h4 className="text-xl font-bold text-white mb-2 opacity-20 font-display">COMMAND MAP ACTIVE</h4>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-40">Showing 6 registered terminals</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Real-Time Alerts */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <Card className="flex-1 bg-white/[0.02] border-white/10 rounded-3xl p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                           <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                Critical Alerts
                            </h4>
                            <span className="text-[10px] font-bold text-red-500 underline decoration-red-500/30 underline-offset-4 cursor-pointer hover:text-red-400">View All</span>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="space-y-4">
                                {alerts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                            <Activity className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Integrity Levels Nominal</p>
                                    </div>
                                ) : (
                                    alerts.map((alert) => (
                                        <div key={alert.id} className="p-4 bg-red-400/5 border border-red-500/10 rounded-2xl flex items-start gap-4">
                                            <div className="p-2 bg-red-500/10 rounded-xl">
                                                <AlertTriangle size={16} className="text-red-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white mb-1 uppercase tracking-wider">{alert.employee_name}</p>
                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                                                    {alert.alerts.late ? "Detected Late Arrival" : "Unusual Punch Pattern"}
                                                </p>
                                                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                                                    <Clock size={12} />
                                                    <span>{alert.time}</span>
                                                    <span>•</span>
                                                    <span>{alert.device}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </Card>

                    <Card className="h-44 bg-gradient-to-br from-primary/10 to-purple-600/10 border-primary/20 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Intelligence Overview</p>
                                    <h5 className="text-lg font-bold text-white tracking-tight">Pattern Variance</h5>
                                </div>
                                <div className="p-2.5 bg-primary/20 rounded-xl text-primary animate-pulse">
                                    <Activity size={20} />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white tabular-nums tracking-tighter">0.04%</span>
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Low Anomaly</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl transition-all group-hover:scale-150 group-hover:bg-primary/20" />
                    </Card>
                </div>
            </div>
        </div>
      </div>

      {/* Selfie Preview Modal (Overlay) */}
      <AnimatePresence>
        {selectedEvent && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedEvent(null)}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-2xl w-full bg-slate-900 border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-6 right-6">
                        <button onClick={() => setSelectedEvent(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                            <LayoutGrid size={20} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="relative flex flex-col items-center">
                        <div className="w-64 h-64 rounded-3xl overflow-hidden border-4 border-primary/20 mb-6 group relative">
                             {selectedEvent.face_image ? (
                                <img src={selectedEvent.face_image} className="w-full h-full object-cover" alt="Selfie" />
                             ) : (
                                <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-slate-500">
                                    <User size={64} className="opacity-20 mb-4" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No face scan captured</p>
                                </div>
                             )}
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2">{selectedEvent.employee_name}</h2>
                        <div className="flex gap-4 mb-8">
                            <Badge className="bg-primary/20 text-primary border-none font-black px-4 py-1.5 uppercase tracking-widest text-[11px]">{selectedEvent.event}</Badge>
                            <Badge variant="outline" className="border-white/10 text-slate-400 px-4 py-1.5 uppercase tracking-widest text-[11px]">{selectedEvent.device}</Badge>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4">
                            <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Time Profile</p>
                                <p className="text-lg font-bold text-white">{selectedEvent.time}</p>
                            </div>
                            <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Integrity Code</p>
                                <p className={`text-lg font-bold ${selectedEvent.alerts.late || selectedEvent.alerts.unusual ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {selectedEvent.alerts.late || selectedEvent.alerts.unusual ? "RISK FLAG" : "NOMINAL"}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveAttendanceDashboard;
