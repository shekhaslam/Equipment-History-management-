import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EquipmentQR } from "../components/QRCodeGen"; 
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useLocation } from "wouter";

export default function QRManagement() {
  const [, setLocation] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const { data: equipments, isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/equipment"] 
  });

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 print:grid-cols-2 print:gap-4 print:p-0">
          {equipments?.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div 
                key={item.id} 
                onClick={() => toggleSelect(item.id)}
                className={`relative group p-4 bg-white rounded-3xl border-4 transition-all
                  ${isSelected ? "border-[#D41217] shadow-xl" : "border-transparent opacity-70"}
                  ${isSelected ? "print:flex" : "print:hidden"}
                `}
                style={{ breakInside: 'avoid' }} // Extra page rokne ke liye
              >
                <div className="no-print absolute top-4 right-4 z-10">
                  {isSelected ? <CheckCircle2 className="w-8 h-8 text-green-500 fill-white" /> : <Circle className="w-8 h-8 text-slate-300" />}
                </div>

                <div className="flex justify-center print:scale-90">
                  <EquipmentQR equipment={item} />
                </div>

                {/* Footer only for Print (Optional) */}
                <p className="hidden print:block text-[8px] text-center mt-1 text-slate-400">
                  Dev: Shekh Aslam, RMS X DN
                </p>
              </div>
            );
          })}
        </div>
      </main>

      {/* 3. CLEAN PRINT CSS */}
      <style>{`
        @media print {
          /* Faltu kachra aur extra pages saaf karein */
          .no-print, header, footer, .sidebar, button { display: none !important; }
          
          body, html { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            height: auto !important;
          }

          /* Pages per sheet ki jagah humara grid kaam karega */
          .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10mm !important;
          }

          @page { 
            size: A4; 
            margin: 10mm; 
          }

          /* Developer name ko extra page banane se rokna */
          .page-break { display: none !important; }
        }
      `}</style>
    </div>
  );
}