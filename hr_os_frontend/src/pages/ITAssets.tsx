import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Trash2,
  Cpu,
  Layers,
  Package,
  Building,
  AlertTriangle,
  Loader2,
  HardDrive,
  User
} from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ITAsset } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useStockItems,
  useCreateStockItem,
  useUpdateStockItem,
  useDeleteStockItem,
  ITStockItem
} from "@/lib/itStockApi";

export default function ITAssets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "warehouse" | "office">("office");
  
  // Track cell currently being edited to avoid network delay lags and cursor jumps
  const [focusedCell, setFocusedCell] = useState<{
    id: string;
    field: keyof ITAsset;
    value: string;
  } | null>(null);

  // Fetch IT Assets from SQLite Database
  const { data: assets, isLoading, refetch } = useQuery<ITAsset[]>({
    queryKey: ["it-assets"],
    queryFn: async () => {
      const res = await api.get<ITAsset[]>("/it-assets");
      return res || [];
    },
  });

  // Create Mutation (Inserts a 100% clean, blank row ready to be manually typed)
  const addMutation = useMutation({
    mutationFn: async (data: Partial<ITAsset>) => {
      return await api.post("/it-assets/", data);
    },
    onSuccess: () => {
      toast.success("New empty row added. Type details manually in any cell!");
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update Mutation (Auto-saves on blur or pressing Enter)
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; payload: Partial<ITAsset> }) => {
      return await api.put(`/it-assets/${data.id}`, data.payload);
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/it-assets/${id}`);
    },
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // IT Stock Management States & Hooks
  const [managerView, setManagerView] = useState<"hardware" | "stock">("hardware");
  const [focusedStockCell, setFocusedStockCell] = useState<{
    id: string;
    field: keyof ITStockItem;
    value: string;
  } | null>(null);

  const { data: stockItems, isLoading: isStockLoading, refetch: refetchStock } = useStockItems();
  const createStockMutation = useCreateStockItem();
  const updateStockMutation = useUpdateStockItem();
  const deleteStockMutation = useDeleteStockItem();

  // Add Asset Form States
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  const [hardwareForm, setHardwareForm] = useState({
    brand: "",
    model: "",
    asset_tag: "",
    asset_type: "laptop",
    desktop_name: "",
    processor: "",
    ram: "",
    storage: "",
    operating_system: "",
    gpu: "",
    location: "Office",
    status: "AVAILABLE",
    issue: "",
  });

  const [stockForm, setStockForm] = useState({
    category: "Peripheral",
    item_name: "",
    brand_model: "",
    total_stock: "1",
    issued_qty: "0",
    remaining_qty: "",
    issued_to: "",
    department: "",
    issue_date: new Date().toISOString().split("T")[0],
    unit: "pcs",
    reorder_required: "No",
  });

  const handleHardwareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hardwareForm.brand || !hardwareForm.model) {
      toast.error("Please fill in Brand and Model");
      return;
    }
    addMutation.mutate(hardwareForm, {
      onSuccess: () => {
        setIsHardwareModalOpen(false);
        setHardwareForm({
          brand: "",
          model: "",
          asset_tag: "",
          asset_type: "laptop",
          desktop_name: "",
          processor: "",
          ram: "",
          storage: "",
          operating_system: "",
          gpu: "",
          location: "Office",
          status: "AVAILABLE",
          issue: "",
        });
      }
    });
  };

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.item_name || !stockForm.category) {
      toast.error("Please fill in Item Name and Category");
      return;
    }
    const total = parseInt(stockForm.total_stock) || 0;
    const issued = parseInt(stockForm.issued_qty) || 0;
    const remaining = stockForm.remaining_qty ? stockForm.remaining_qty : String(Math.max(0, total - issued));

    createStockMutation.mutate({
      ...stockForm,
      remaining_qty: remaining,
    }, {
      onSuccess: () => {
        setIsStockModalOpen(false);
        setStockForm({
          category: "Peripheral",
          item_name: "",
          brand_model: "",
          total_stock: "1",
          issued_qty: "0",
          remaining_qty: "",
          issued_to: "",
          department: "",
          issue_date: new Date().toISOString().split("T")[0],
          unit: "pcs",
          reorder_required: "No",
        });
      }
    });
  };

  // Calculate Metrics
  const totalCount = assets?.length ?? 0;
  const warehouseCount = assets?.filter(a => (a.location || "").toLowerCase() === "warehouse").length ?? 0;
  const officeCount = assets?.filter(a => (a.location || "").toLowerCase() === "office").length ?? 0;
  const issueCount = assets?.filter(a => a.issue && a.issue.trim() !== "").length ?? 0;

  // Filter Assets
  const filteredAssets = assets?.filter((asset) => {
    // 1. Location tab filter
    const loc = (asset.location || "").toLowerCase();
    if (activeTab === "warehouse" && loc !== "warehouse") return false;
    if (activeTab === "office" && loc !== "office") return false;

    // 2. Real-time Search term filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (asset.brand || "").toLowerCase().includes(term) ||
      (asset.model || "").toLowerCase().includes(term) ||
      (asset.asset_tag || "").toLowerCase().includes(term) ||
      (asset.asset_type || "").toLowerCase().includes(term) ||
      (asset.desktop_name || "").toLowerCase().includes(term) ||
      (asset.processor || "").toLowerCase().includes(term) ||
      (asset.ram || "").toLowerCase().includes(term) ||
      (asset.storage || "").toLowerCase().includes(term) ||
      (asset.operating_system || "").toLowerCase().includes(term) ||
      (asset.location || "").toLowerCase().includes(term) ||
      (asset.assigned_to_name || "").toLowerCase().includes(term) ||
      (asset.status || "").toLowerCase().includes(term)
    );
  });

  // Handle cell edit trigger
  const handleCellBlur = (id: string, field: keyof ITAsset, currentValue: string) => {
    if (focusedCell && focusedCell.id === id && focusedCell.field === field) {
      const newValue = focusedCell.value.trim();
      if (newValue !== currentValue) {
        updateMutation.mutate({
          id,
          payload: { [field]: newValue }
        });
      }
      setFocusedCell(null);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, id: string, field: keyof ITAsset, currentValue: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Add Asset Inline Trigger (inserts a clean blank row ready for manual entry)
  const handleAddNewAsset = () => {
    const defaultLoc = activeTab === "warehouse" ? "Warehouse" : "Office";
    addMutation.mutate({
      brand: "",
      model: "",
      asset_tag: "",
      asset_type: "",
      desktop_name: "",
      processor: "",
      ram: "",
      storage: "",
      operating_system: "",
      gpu: "",
      location: defaultLoc,
      assigned_to: "",
      status: "AVAILABLE",
      issue: ""
    });
  };

  // Filter Stock Items
  const filteredStock = stockItems?.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.category || "").toLowerCase().includes(term) ||
      (item.item_name || "").toLowerCase().includes(term) ||
      (item.brand_model || "").toLowerCase().includes(term) ||
      (item.issued_to || "").toLowerCase().includes(term) ||
      (item.department || "").toLowerCase().includes(term)
    );
  });

  // Calculate stock metrics
  const totalStockItems = stockItems?.length ?? 0;
  const totalReceivedQty = stockItems?.reduce((acc, item) => {
    const qty = parseInt(item.total_stock) || 0;
    return acc + qty;
  }, 0) ?? 0;
  const totalIssuedQty = stockItems?.reduce((acc, item) => {
    const qty = parseInt(item.issued_qty) || 0;
    return acc + qty;
  }, 0) ?? 0;
  const reorderAlertCount = stockItems?.filter(item => (item.reorder_required || "").toLowerCase() === "yes").length ?? 0;

  // Handle stock cell edit trigger
  const handleStockCellBlur = (id: string, field: keyof ITStockItem, currentValue: string) => {
    if (focusedStockCell && focusedStockCell.id === id && focusedStockCell.field === field) {
      const newValue = focusedStockCell.value.trim();
      if (newValue !== currentValue) {
        updateStockMutation.mutate({
          id,
          payload: { [field]: newValue }
        });
      }
      setFocusedStockCell(null);
    }
  };

  const handleStockCellKeyDown = (e: React.KeyboardEvent, id: string, field: keyof ITStockItem, currentValue: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleAddNewStockItem = () => {
    createStockMutation.mutate({
      category: "Peripheral",
      item_name: "New Item",
      brand_model: "",
      total_stock: "0",
      issued_qty: "0",
      remaining_qty: "0",
      issued_to: "",
      department: "",
      issue_date: new Date().toISOString().split("T")[0],
      unit: "pcs",
      reorder_required: "No"
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Zipa IT Assets Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time spreadsheet-style asset database. Type any detail manually into any cell.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {(updateMutation.isPending || updateStockMutation.isPending) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Auto-saving...
            </div>
          )}
          <Button 
            className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md transition-all font-medium rounded-xl px-4" 
            onClick={() => managerView === "hardware" ? setIsHardwareModalOpen(true) : setIsStockModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            {managerView === "hardware" ? "Add IT Asset" : "Add Stock Item"}
          </Button>
        </div>
      </div>

      {/* SEGMENT VIEW SELECTOR (Hardware vs. Stock) */}
      <div className="flex border-b border-white/[0.06] pb-1 space-x-6">
        <button
          onClick={() => setManagerView("hardware")}
          className={`pb-3 text-sm font-semibold tracking-wide uppercase transition-all duration-200 border-b-2 relative ${
            managerView === "hardware"
              ? "border-indigo-500 text-foreground font-extrabold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Laptops & Devices Register
        </button>
        <button
          onClick={() => setManagerView("stock")}
          className={`pb-3 text-sm font-semibold tracking-wide uppercase transition-all duration-200 border-b-2 relative ${
            managerView === "stock"
              ? "border-indigo-500 text-foreground font-extrabold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          IT Stock & Peripherals Register
        </button>
      </div>

      {/* METRICS INVENTORY CARDS */}
      {managerView === "hardware" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total inventory */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Total Assets</span>
              <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-500">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{totalCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">Tracked hardware items</p>
            </div>
          </div>

          {/* Office assets */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Office Inventory</span>
              <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-400">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{officeCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">Deployed in office desks</p>
            </div>
          </div>

          {/* Warehouse assets */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Warehouse Stock</span>
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{warehouseCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">Available in main warehouse</p>
            </div>
          </div>

          {/* Assets with issues */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Reported Issues</span>
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{issueCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">Laptops requiring repair</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Stock Items */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Stock Categories</span>
              <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-500">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{totalStockItems}</h3>
              <p className="text-xs text-muted-foreground mt-1">Unique item categories</p>
            </div>
          </div>

          {/* Total received */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Total Stock Received</span>
              <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-400">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{totalReceivedQty}</h3>
              <p className="text-xs text-muted-foreground mt-1">Total units processed</p>
            </div>
          </div>

          {/* Total issued */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Units Issued</span>
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{totalIssuedQty}</h3>
              <p className="text-xs text-muted-foreground mt-1">Units deployed to employees</p>
            </div>
          </div>

          {/* Reorder Alerts */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Reorder Alerts</span>
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{reorderAlertCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">Items requiring reorder</p>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & TABS BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6">
        {managerView === "hardware" ? (
          <div className="flex p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl self-start">
            <button
              onClick={() => setActiveTab("office")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                activeTab === "office"
                  ? "bg-white/[0.06] text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Office Deployed ({officeCount})
            </button>
            <button
              onClick={() => setActiveTab("warehouse")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                activeTab === "warehouse"
                  ? "bg-white/[0.06] text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Warehouse Stock ({warehouseCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                activeTab === "all"
                  ? "bg-white/[0.06] text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Inventory ({totalCount})
            </button>
          </div>
        ) : (
          <div className="flex items-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold uppercase tracking-wider">
            Stock Registry Aggregation
          </div>
        )}

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={managerView === "hardware" ? "Search brand, model, SN, assignee..." : "Search category, item, brand..."}
            className="pl-10 pr-4 py-2 bg-white/[0.01] hover:bg-white/[0.02] border-white/[0.08] focus:border-indigo-500/50 rounded-xl text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* SPREADSHEET-STYLE INTERACTIVE GRID */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0b0f19] overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          {managerView === "hardware" ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3.5 font-bold text-center w-12">#</th>
                  <th className="px-3 py-3.5 font-bold min-w-[100px]">Brand</th>
                  <th className="px-3 py-3.5 font-bold min-w-[150px]">Model</th>
                  <th className="px-3 py-3.5 font-bold min-w-[120px]">Serial / Tag</th>
                  <th className="px-3 py-3.5 font-bold min-w-[110px]">Type</th>
                  <th className="px-3 py-3.5 font-bold min-w-[130px]">Hostname</th>
                  <th className="px-3 py-3.5 font-bold min-w-[150px]">Processor (CPU)</th>
                  <th className="px-3 py-3.5 font-bold min-w-[90px]">RAM</th>
                  <th className="px-3 py-3.5 font-bold min-w-[110px]">Storage</th>
                  <th className="px-3 py-3.5 font-bold min-w-[120px]">OS</th>
                  <th className="px-3 py-3.5 font-bold min-w-[150px]">GPU / Graphics</th>
                  <th className="px-3 py-3.5 font-bold min-w-[120px]">Location</th>
                  <th className="px-3 py-3.5 font-bold min-w-[180px]">Assigned To</th>
                  <th className="px-3 py-3.5 font-bold min-w-[130px]">Status</th>
                  <th className="px-3 py-3.5 font-bold min-w-[180px]">Health Issue Notes</th>
                  <th className="px-3 py-3.5 font-bold text-center w-16">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {isLoading ? (
                  <tr>
                    <td colSpan={16} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <span className="text-sm text-muted-foreground font-medium">Loading inventory...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAssets?.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-20 text-muted-foreground text-sm">
                      No hardware assets found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredAssets?.map((asset, index) => {
                    const isAssigned = !!(asset.assigned_to_name?.trim() || asset.assigned_to?.trim());
                    return (
                      <tr key={asset.id} className="hover:bg-white/[0.01] transition-colors group/row text-xs">
                        {/* Index */}
                        <td className="px-3 py-2 text-center text-muted-foreground border-r border-white/[0.03]">
                          {index + 1}
                        </td>

                        {/* Brand (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 font-medium text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "brand" ? focusedCell.value : asset.brand || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "brand", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "brand", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "brand", asset.brand || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "brand", asset.brand || "")}
                          />
                        </td>

                        {/* Model (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 font-medium text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "model" ? focusedCell.value : asset.model || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "model", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "model", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "model", asset.model || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "model", asset.model || "")}
                          />
                        </td>

                        {/* Serial Tag (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03] font-mono">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 font-mono text-indigo-400 font-semibold transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "asset_tag" ? focusedCell.value : asset.asset_tag || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "asset_tag", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "asset_tag", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "asset_tag", asset.asset_tag || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "asset_tag", asset.asset_tag || "")}
                          />
                        </td>

                        {/* Type (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            placeholder="e.g. laptop"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "asset_type" ? focusedCell.value : asset.asset_type || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "asset_type", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "asset_type", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "asset_type", asset.asset_type || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "asset_type", asset.asset_type || "")}
                          />
                        </td>

                        {/* Desktop Name (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "desktop_name" ? focusedCell.value : asset.desktop_name || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "desktop_name", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "desktop_name", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "desktop_name", asset.desktop_name || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "desktop_name", asset.desktop_name || "")}
                          />
                        </td>

                        {/* Processor (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "processor" ? focusedCell.value : asset.processor || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "processor", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "processor", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "processor", asset.processor || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "processor", asset.processor || "")}
                          />
                        </td>

                        {/* RAM (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "ram" ? focusedCell.value : asset.ram || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "ram", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "ram", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "ram", asset.ram || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "ram", asset.ram || "")}
                          />
                        </td>

                        {/* Storage (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "storage" ? focusedCell.value : asset.storage || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "storage", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "storage", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "storage", asset.storage || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "storage", asset.storage || "")}
                          />
                        </td>

                        {/* OS (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "operating_system" ? focusedCell.value : asset.operating_system || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "operating_system", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "operating_system", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "operating_system", asset.operating_system || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "operating_system", asset.operating_system || "")}
                          />
                        </td>

                        {/* GPU (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "gpu" ? focusedCell.value : asset.gpu || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "gpu", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "gpu", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "gpu", asset.gpu || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "gpu", asset.gpu || "")}
                          />
                        </td>

                        {/* Location (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            placeholder="e.g. Office"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "location" ? focusedCell.value : asset.location || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "location", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "location", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "location", asset.location || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "location", asset.location || "")}
                          />
                        </td>

                        {/* Assigned To (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <div className="flex items-center gap-1.5">
                            {isAssigned && <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                            <input
                              type="text"
                              placeholder="Unassigned"
                              className={`w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 transition-all hover:bg-white/[0.02] ${
                                isAssigned ? "text-indigo-400 font-semibold" : "text-muted-foreground"
                              }`}
                              value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "assigned_to_name" ? focusedCell.value : asset.assigned_to_name || ""}
                              onChange={(e) => setFocusedCell({ id: asset.id, field: "assigned_to_name", value: e.target.value })}
                              onFocus={(e) => setFocusedCell({ id: asset.id, field: "assigned_to_name", value: e.target.value })}
                              onBlur={() => handleCellBlur(asset.id, "assigned_to_name", asset.assigned_to_name || "")}
                              onKeyDown={(e) => handleCellKeyDown(e, asset.id, "assigned_to_name", asset.assigned_to_name || "")}
                            />
                          </div>
                        </td>

                        {/* Status (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 font-semibold transition-all hover:bg-white/[0.02]"
                            value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "status" ? focusedCell.value : asset.status || ""}
                            onChange={(e) => setFocusedCell({ id: asset.id, field: "status", value: e.target.value })}
                            onFocus={(e) => setFocusedCell({ id: asset.id, field: "status", value: e.target.value })}
                            onBlur={() => handleCellBlur(asset.id, "status", asset.status || "")}
                            onKeyDown={(e) => handleCellKeyDown(e, asset.id, "status", asset.status || "")}
                          />
                        </td>

                        {/* Issue (Input) */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <div className="flex items-center gap-1.5">
                            {asset.issue && asset.issue.trim() !== "" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            <input
                              type="text"
                              placeholder="No issues"
                              className={`w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 transition-all hover:bg-white/[0.02] ${
                                asset.issue && asset.issue.trim() !== "" ? "text-amber-400 font-semibold" : "text-muted-foreground"
                              }`}
                              value={focusedCell && focusedCell.id === asset.id && focusedCell.field === "issue" ? focusedCell.value : asset.issue || ""}
                              onChange={(e) => setFocusedCell({ id: asset.id, field: "issue", value: e.target.value })}
                              onFocus={(e) => setFocusedCell({ id: asset.id, field: "issue", value: e.target.value })}
                              onBlur={() => handleCellBlur(asset.id, "issue", asset.issue || "")}
                              onKeyDown={(e) => handleCellKeyDown(e, asset.id, "issue", asset.issue || "")}
                            />
                          </div>
                        </td>

                        {/* Delete Action */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Remove asset ${asset.brand} ${asset.model} (${asset.asset_tag})?`)) {
                                deleteMutation.mutate(asset.id);
                              }
                            }}
                            className="p-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all scale-95 hover:scale-105 active:scale-95"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3.5 font-bold text-center w-12">#</th>
                  <th className="px-3 py-3.5 font-bold min-w-[120px]">Item Category</th>
                  <th className="px-3 py-3.5 font-bold min-w-[150px]">Item Name</th>
                  <th className="px-3 py-3.5 font-bold min-w-[180px]">Brand / Model</th>
                  <th className="px-3 py-3.5 font-bold min-w-[100px]">Total Stock</th>
                  <th className="px-3 py-3.5 font-bold min-w-[100px]">Issued Qty</th>
                  <th className="px-3 py-3.5 font-bold min-w-[120px]">Remaining Stock</th>
                  <th className="px-3 py-3.5 font-bold min-w-[200px]">Issued To</th>
                  <th className="px-3 py-3.5 font-bold min-w-[180px]">Department</th>
                  <th className="px-3 py-3.5 font-bold min-w-[120px]">Issue Date</th>
                  <th className="px-3 py-3.5 font-bold min-w-[80px]">Unit</th>
                  <th className="px-3 py-3.5 font-bold min-w-[120px]">Reorder Required</th>
                  <th className="px-3 py-3.5 font-bold text-center w-16">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {isStockLoading ? (
                  <tr>
                    <td colSpan={13} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <span className="text-sm text-muted-foreground font-medium">Loading stock...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStock?.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-20 text-muted-foreground text-sm">
                      No stock items found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredStock?.map((item, index) => {
                    const isReorder = (item.reorder_required || "").toLowerCase() === "yes";
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group/row text-xs">
                        {/* Index */}
                        <td className="px-3 py-2 text-center text-muted-foreground border-r border-white/[0.03]">
                          {index + 1}
                        </td>

                        {/* Category */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 font-medium text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "category" ? focusedStockCell.value : item.category || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "category", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "category", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "category", item.category || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "category", item.category || "")}
                          />
                        </td>

                        {/* Item Name */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 font-medium text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "item_name" ? focusedStockCell.value : item.item_name || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "item_name", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "item_name", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "item_name", item.item_name || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "item_name", item.item_name || "")}
                          />
                        </td>

                        {/* Brand / Model */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "brand_model" ? focusedStockCell.value : item.brand_model || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "brand_model", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "brand_model", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "brand_model", item.brand_model || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "brand_model", item.brand_model || "")}
                          />
                        </td>

                        {/* Total Stock */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02] text-center"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "total_stock" ? focusedStockCell.value : item.total_stock || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "total_stock", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "total_stock", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "total_stock", item.total_stock || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "total_stock", item.total_stock || "")}
                          />
                        </td>

                        {/* Issued Qty */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02] text-center"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "issued_qty" ? focusedStockCell.value : item.issued_qty || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "issued_qty", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "issued_qty", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "issued_qty", item.issued_qty || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "issued_qty", item.issued_qty || "")}
                          />
                        </td>

                        {/* Remaining Stock */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02] text-center font-bold text-indigo-400"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "remaining_qty" ? focusedStockCell.value : item.remaining_qty || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "remaining_qty", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "remaining_qty", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "remaining_qty", item.remaining_qty || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "remaining_qty", item.remaining_qty || "")}
                          />
                        </td>

                        {/* Issued To */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            placeholder="No one"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "issued_to" ? focusedStockCell.value : item.issued_to || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "issued_to", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "issued_to", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "issued_to", item.issued_to || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "issued_to", item.issued_to || "")}
                          />
                        </td>

                        {/* Department */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            placeholder="N/A"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "department" ? focusedStockCell.value : item.department || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "department", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "department", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "department", item.department || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "department", item.department || "")}
                          />
                        </td>

                        {/* Issue Date */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            placeholder="YYYY-MM-DD"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "issue_date" ? focusedStockCell.value : item.issue_date || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "issue_date", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "issue_date", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "issue_date", item.issue_date || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "issue_date", item.issue_date || "")}
                          />
                        </td>

                        {/* Unit */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-2 py-1 text-foreground transition-all hover:bg-white/[0.02]"
                            value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "unit" ? focusedStockCell.value : item.unit || ""}
                            onChange={(e) => setFocusedStockCell({ id: item.id, field: "unit", value: e.target.value })}
                            onFocus={(e) => setFocusedStockCell({ id: item.id, field: "unit", value: e.target.value })}
                            onBlur={() => handleStockCellBlur(item.id, "unit", item.unit || "")}
                            onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "unit", item.unit || "")}
                          />
                        </td>

                        {/* Reorder Required */}
                        <td className="px-2 py-1.5 border-r border-white/[0.03]">
                          <div className="flex items-center gap-1.5 px-2">
                            {isReorder && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                            <input
                              type="text"
                              className={`w-full bg-transparent border-0 outline-none rounded focus:bg-white/[0.05] focus:ring-1 focus:ring-indigo-500/50 px-1 py-1 font-semibold transition-all hover:bg-white/[0.02] ${
                                isReorder ? "text-rose-400 font-bold" : "text-muted-foreground"
                              }`}
                              value={focusedStockCell && focusedStockCell.id === item.id && focusedStockCell.field === "reorder_required" ? focusedStockCell.value : item.reorder_required || "No"}
                              onChange={(e) => setFocusedStockCell({ id: item.id, field: "reorder_required", value: e.target.value })}
                              onFocus={(e) => setFocusedStockCell({ id: item.id, field: "reorder_required", value: e.target.value })}
                              onBlur={() => handleStockCellBlur(item.id, "reorder_required", item.reorder_required || "No")}
                              onKeyDown={(e) => handleStockCellKeyDown(e, item.id, "reorder_required", item.reorder_required || "No")}
                            />
                          </div>
                        </td>

                        {/* Delete Action */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Remove stock item ${item.item_name}?`)) {
                                deleteStockMutation.mutate(item.id);
                              }
                            }}
                            className="p-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all scale-95 hover:scale-105 active:scale-95"
                            title="Delete Stock Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD HARDWARE ASSET DIALOG MODAL */}
      <Dialog open={isHardwareModalOpen} onOpenChange={setIsHardwareModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-white rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Add Laptop / Device Asset
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Create a new hardware device asset.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleHardwareSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="h-brand" className="text-xs text-slate-300">Brand *</Label>
                <Input
                  id="h-brand"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. HP"
                  value={hardwareForm.brand}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, brand: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-model" className="text-xs text-slate-300">Model *</Label>
                <Input
                  id="h-model"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. ProBook 450"
                  value={hardwareForm.model}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, model: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="h-tag" className="text-xs text-slate-300">Serial / Asset Tag</Label>
                <Input
                  id="h-tag"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl font-mono text-indigo-300"
                  placeholder="e.g. SN-XYZ123"
                  value={hardwareForm.asset_tag}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, asset_tag: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-type" className="text-xs text-slate-300">Asset Type</Label>
                <select
                  id="h-type"
                  className="w-full bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  value={hardwareForm.asset_type}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, asset_type: e.target.value })}
                >
                  <option value="laptop">Laptop</option>
                  <option value="desktop">Desktop</option>
                  <option value="mobile_phone">Mobile Phone</option>
                  <option value="tablet">Tablet</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="h-hostname" className="text-xs text-slate-300">Hostname (Desktop Name)</Label>
                <Input
                  id="h-hostname"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. ZIP-LAP-04"
                  value={hardwareForm.desktop_name}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, desktop_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-cpu" className="text-xs text-slate-300">Processor (CPU)</Label>
                <Input
                  id="h-cpu"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. Core i5 11th Gen"
                  value={hardwareForm.processor}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, processor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="h-ram" className="text-xs text-slate-300">RAM</Label>
                <Input
                  id="h-ram"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. 16GB"
                  value={hardwareForm.ram}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, ram: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-storage" className="text-xs text-slate-300">Storage</Label>
                <Input
                  id="h-storage"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. 512GB SSD"
                  value={hardwareForm.storage}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, storage: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-os" className="text-xs text-slate-300">Operating System</Label>
                <Input
                  id="h-os"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. Windows 11"
                  value={hardwareForm.operating_system}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, operating_system: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="h-location" className="text-xs text-slate-300">Location</Label>
                <select
                  id="h-location"
                  className="w-full bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  value={hardwareForm.location}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, location: e.target.value })}
                >
                  <option value="Office">Office</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-status" className="text-xs text-slate-300">Status</Label>
                <select
                  id="h-status"
                  className="w-full bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  value={hardwareForm.status}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, status: e.target.value })}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="REPAIRING">REPAIRING</option>
                  <option value="SCRAPPED">SCRAPPED</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="h-issue" className="text-xs text-slate-300">Health Issue Notes</Label>
              <Input
                id="h-issue"
                className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                placeholder="Describe any hardware problems..."
                value={hardwareForm.issue}
                onChange={(e) => setHardwareForm({ ...hardwareForm, issue: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHardwareModalOpen(false)}
                className="border-white/10 hover:bg-white/5 text-slate-400 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl"
              >
                {addMutation.isPending ? "Adding..." : "Add Device"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD STOCK ITEM DIALOG MODAL */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border border-white/10 text-white rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Add Stock / Peripheral Item
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Add a new peripheral stock line to inventory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStockSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-category" className="text-xs text-slate-300">Category *</Label>
                <select
                  id="s-category"
                  className="w-full bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  value={stockForm.category}
                  onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}
                >
                  <option value="Peripheral">Peripheral</option>
                  <option value="Printer Ink">Printer Ink</option>
                  <option value="cabel">Cable</option>
                  <option value="Security card">Security Card</option>
                  <option value="charger laptop">Laptop Charger</option>
                  <option value="adaptor">Adapter</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-name" className="text-xs text-slate-300">Item Name *</Label>
                <Input
                  id="s-name"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. Mouse, Keyboard, HDMI"
                  value={stockForm.item_name}
                  onChange={(e) => setStockForm({ ...stockForm, item_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-brand" className="text-xs text-slate-300">Brand / Model</Label>
              <Input
                id="s-brand"
                className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                placeholder="e.g. HP M10, Dell KB216"
                value={stockForm.brand_model}
                onChange={(e) => setStockForm({ ...stockForm, brand_model: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-total" className="text-xs text-slate-300">Total Stock</Label>
                <Input
                  id="s-total"
                  type="text"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. 10"
                  value={stockForm.total_stock}
                  onChange={(e) => setStockForm({ ...stockForm, total_stock: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-issued" className="text-xs text-slate-300">Issued Qty</Label>
                <Input
                  id="s-issued"
                  type="text"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. 2"
                  value={stockForm.issued_qty}
                  onChange={(e) => setStockForm({ ...stockForm, issued_qty: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-unit" className="text-xs text-slate-300">Unit</Label>
                <Input
                  id="s-unit"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. pcs, pack"
                  value={stockForm.unit}
                  onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-issued-to" className="text-xs text-slate-300">Issued To</Label>
                <Input
                  id="s-issued-to"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. Vijay, Simran"
                  value={stockForm.issued_to}
                  onChange={(e) => setStockForm({ ...stockForm, issued_to: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-department" className="text-xs text-slate-300">Department</Label>
                <Input
                  id="s-department"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl"
                  placeholder="e.g. Warehouse, IT"
                  value={stockForm.department}
                  onChange={(e) => setStockForm({ ...stockForm, department: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-date" className="text-xs text-slate-300">Issue Date</Label>
                <Input
                  id="s-date"
                  type="date"
                  className="bg-white/[0.03] border-white/10 focus:border-indigo-500 rounded-xl text-white"
                  value={stockForm.issue_date}
                  onChange={(e) => setStockForm({ ...stockForm, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-reorder" className="text-xs text-slate-300">Reorder Required</Label>
                <select
                  id="s-reorder"
                  className="w-full bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  value={stockForm.reorder_required}
                  onChange={(e) => setStockForm({ ...stockForm, reorder_required: e.target.value })}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStockModalOpen(false)}
                className="border-white/10 hover:bg-white/5 text-slate-400 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createStockMutation.isPending}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl"
              >
                {createStockMutation.isPending ? "Adding..." : "Add Stock Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
