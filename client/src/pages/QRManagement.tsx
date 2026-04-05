import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { EquipmentQR } from "../components/QRCodeGen";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft, CheckCircle2, Circle, Search } from "lucide-react";
import { useLocation, useSearch } from "wouter";

export default function QRManagement() {
  const [, setLocation] = useLocation();
  const queryParams = new URLSearchParams(useSearch());
  const initialSearch = queryParams.get("search") || "";
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState(initialSearch);

  const { data: equipments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/equipment"]
  });

  // Auto-select and filter if landing via shortcut
  useEffect(() => {
    if (equipments && initialSearch) {
      const matched = equipments.filter(item => 
        item.equipmentName?.toLowerCase().includes(initialSearch.toLowerCase()) || 
        item.serialNumber?.toLowerCase().includes(initialSearch.toLowerCase())
      );
      if (matched.length > 0) {
        setSelectedIds(matched.map(m => m.id));
        
        // Direct Print logic
        if (queryParams.get("print") === "true") {
          setTimeout(() => {
            window.print();
          }, 1000); // Give time for QR to render
        }
      }
    }
  }, [equipments, initialSearch]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (equipments) {
      setSelectedIds(selectedIds.length === equipments.length ? [] : equipments.map(e => e.id));
    }
  };

  if (isLoading) return <div className="p-20 text-center font-bold uppercase">Scanning...</div>;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 1. HEADER (Screen Only) */}
      <header className="no-print bg-white p-4 border-b flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex gap-4">
          <Button onClick={() => setLocation("/")} variant="ghost" className="font-bold text-slate-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> DASHBOARD
          </Button>
          <Button onClick={selectAll} variant="outline" className="font-bold border-slate-300">
            {selectedIds.length === equipments?.length ? "DESELECT ALL" : "SELECT ALL"}
          </Button>
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search S/N or Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#D41217]/10 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-black text-[#D41217]">{selectedIds.length} SELECTED</span>
          <Button
            disabled={selectedIds.length === 0}
            onClick={() => window.print()}
            className="bg-[#D41217] text-white font-bold px-8 shadow-lg disabled:bg-slate-300"
          >
            <Printer className="w-5 h-5 mr-2" /> PRINT SELECTED
          </Button>
        </div>
      </header>

      {/* 2. QR GRID (Improved Layout) */}
      <main className="p-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 print:grid-cols-2 print:gap-x-4 print:gap-y-6 print:p-0 justify-items-center">
          {equipments?.filter(item => 
            item.equipmentName?.toLowerCase().includes(search.toLowerCase()) || 
            item.serialNumber?.toLowerCase().includes(search.toLowerCase())
          ).map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`relative group transition-all
                  ${isSelected ? "is-selected ring-4 ring-offset-4 ring-[#D41217] rounded-sm" : "opacity-40 grayscale"}
                `}
                style={{ breakInside: 'avoid' }}
              >
                <div className="no-print absolute -top-4 -right-4 z-10">
                  {isSelected ? <CheckCircle2 className="w-10 h-10 text-[#D41217] fill-white shadow-lg" /> : <Circle className="w-8 h-8 text-slate-300" />}
                </div>

                <div className="print:scale-[0.95]">
                  <EquipmentQR equipment={item} />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 3. CLEAN PRINT CSS */}
      <style>{`
        @media print {
          .no-print, header, footer, .sidebar, button { display: none !important; }
          
          body, html { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }

          /* Thermal Printer Optimization */
          @page { 
            size: 120mm 70mm landscape; 
            margin: 0; 
          }

          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .grid {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Force hidden for anything not selected */
          .grid > div {
            display: none !important;
          }

          /* Only show selected ones in print */
          .grid > div.is-selected {
            display: block !important;
            width: 110mm !important;
            height: 72mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto 10mm auto !important; /* A4 par gap ke liye bottom margin */
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
          }

          .print\\:scale-\\[0\\.95\\] {
            transform: scale(1) !important;
          }
        }
      `}</style>
    </div>
  );
}