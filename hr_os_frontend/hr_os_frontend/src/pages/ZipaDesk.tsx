import { useState, useMemo } from "react";
import { useTickets, Ticket } from "@/lib/ticketApi";
import TicketCard from "@/components/zipadesk/TicketCard";
import RaiseTicketModal from "@/components/zipadesk/RaiseTicketModal";
import TicketThread from "@/components/zipadesk/TicketThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { 
  Plus, Search, LifeBuoy, Filter, 
  CheckCircle2, Clock, PlayCircle, 
  AlertTriangle, UserCheck, Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ZipaDesk() {
  const { user } = useAuth();
  const [activeTab, setActiveTab ] = useState("ALL");
  const [search, setSearch] = useState("");
  const [slaFilter, setSlaFilter] = useState<string | undefined>(undefined);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data, isLoading, error } = useTickets({
    status: activeTab === "ALL" ? undefined : activeTab,
    sla_status: slaFilter,
    assigned_to_me: assignedToMe ? true : undefined
  });

  // NORMALIZE API RESPONSE
  const tickets: Ticket[] = useMemo(() => {
    return data?.items || [];
  }, [data]);

  const filteredTickets = useMemo(() => {
    return (tickets ?? []).filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [tickets, search]);

  const counts = useMemo(() => {
     const items = tickets;
     if (!items || items.length === 0) return { ALL: 0, OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
     return items.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
     }, { ALL: items.length, OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 });
  }, [tickets]);

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-500 rounded-2xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Tickets</AlertTitle>
          <AlertDescription>
            There was a problem connecting to the service desk. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        icon={LifeBuoy}
        title="ZipaDesk"
        subtitle="Enterprise service hub for employee support and technical requests."
        actions={
          <div className="flex items-center gap-4">
            <Button 
              variant="outline"
              onClick={() => setAssignedToMe(!assignedToMe)}
              className={`rounded-xl border-white/10 transition-all ${assignedToMe ? 'bg-primary text-white border-primary' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              My Tickets
            </Button>
            
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-white hover:bg-primary/90 rounded-xl flex gap-2"
            >
              <Plus className="w-5 h-5" />
              New Request
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-xl border border-white/10">
              <TabsList className="bg-transparent gap-1 h-10">
                {[
                   { id: "ALL", icon: LifeBuoy, label: "All" },
                   { id: "OPEN", icon: Clock, label: "Open" },
                   { id: "IN_PROGRESS", icon: PlayCircle, label: "Active" },
                   { id: "RESOLVED", icon: CheckCircle2, label: "Solved" }
                ].map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="rounded-lg px-6 py-2 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all gap-2"
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {counts[tab.id] > 0 && (
                       <span className="ml-1 opacity-50">({counts[tab.id]})</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
           </Tabs>

           <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search tickets..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-11 bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-primary text-sm placeholder:text-slate-600 transition-all"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="outline" size="icon" className={`h-11 w-11 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 ${slaFilter ? 'text-primary' : 'text-slate-400'}`}>
                      <Filter className="w-4 h-4" />
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border-white/10 rounded-xl p-2 text-white">
                   <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 py-2">SLA Status</DropdownMenuLabel>
                   <DropdownMenuItem onClick={() => setSlaFilter(undefined)} className="rounded-lg focus:bg-white/10">
                      <span className="text-xs">All Tickets</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setSlaFilter('ON_TRACK')} className="rounded-lg focus:bg-emerald-500/10">
                      <Timer className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                      <span className="text-xs">On Track</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setSlaFilter('AT_RISK')} className="rounded-lg focus:bg-amber-500/10">
                      <AlertTriangle className="w-3.5 h-3.5 mr-2 text-amber-500" />
                      <span className="text-xs">At Risk</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setSlaFilter('BREACHED')} className="rounded-lg focus:bg-red-500/10">
                      <AlertTriangle className="w-3.5 h-3.5 mr-2 text-red-500" />
                      <span className="text-xs">Breached</span>
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </div>

        {slaFilter && (
           <motion.div 
             initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
             className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/5 p-2 px-3 rounded-lg border border-primary/10 w-fit"
           >
              <Filter className="w-3 h-3" />
              SLA: {slaFilter}
              <button onClick={() => setSlaFilter(undefined)} className="ml-2 hover:text-white underline">Clear</button>
           </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 bg-white/[0.03] rounded-2xl border border-white/10" />
            ))
          ) : (filteredTickets ?? []).length > 0 ? (
            (filteredTickets ?? []).map((ticket) => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onClick={setSelectedTicket}
              />
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                <LifeBuoy className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white">No Tickets Found</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">No active service requests match your search or filters.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => { setActiveTab("ALL"); setSearch(""); setSlaFilter(undefined); setAssignedToMe(false); }}
                className="border-white/10 hover:bg-white/5 text-slate-400 rounded-xl"
              >
                Reset Filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RaiseTicketModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />

      <Sheet open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <SheetContent className="sm:max-w-[700px] p-0 bg-background border-border text-foreground overflow-hidden">
          <SheetTitle className="sr-only">Ticket Conversation</SheetTitle>
          <SheetDescription className="sr-only">Thread comments and assignment details for this support request.</SheetDescription>
          {selectedTicket && (
            <TicketThread ticket={selectedTicket} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
