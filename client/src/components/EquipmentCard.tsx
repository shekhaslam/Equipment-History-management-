import { EquipmentWithRepairs } from "@shared/schema";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Wrench, Activity, Download, Power } from "lucide-react";
import { Link } from "wouter";
import { format, isValid } from "date-fns";
import { useMemo } from "react"; // useMemo को जोड़ा गया
import { generateProPDF } from "@/lib/pdfGenerator";
import { useUpdateStatus } from "@/hooks/use-equipment";

export function EquipmentCard({ equipment }: { equipment: EquipmentWithRepairs }) {
  const updateStatusMutation = useUpdateStatus();
  const isCondemned = equipment.status === "CONDEMNED";

  const toggleStatus = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    const nextStatus = isCondemned ? "ACTIVE" : "CONDEMNED";
    updateStatusMutation.mutate({ id: equipment.id, status: nextStatus });
  };

  // ✅ INTELLIGENT DATE LOGIC (N/A को हटाने के लिए)
  const lastUpdateDisplay = useMemo(() => {
    // 1. अगर Repairs मौजूद हैं, तो सबसे ताज़ा मरम्मत की तारीख निकालें
    if (equipment.repairs && equipment.repairs.length > 0) {
      const dates = equipment.repairs
        .map(r => new Date(r.date))
        .filter(d => isValid(d));
      
      if (dates.length > 0) {
        const latest = new Date(Math.max(...dates.map(d => d.getTime())));
        return `Updated: ${format(latest, "MMM yyyy")}`; // Ex: Updated: Feb 2026
      }
    }
    
    // 2. अगर कोई Repair नहीं है, तो Created date दिखाएं
    if (equipment.createdAt) {
      const createdDate = new Date(equipment.createdAt);
      return isValid(createdDate) ? `Created: ${format(createdDate, "MMM yyyy")}` : "N/A";
    }

    return "N/A";
  }, [equipment]);

  return (
    <Link href={`/equipment/${equipment.id}`} className="group">
      <Card className={`transition-all duration-200 border-slate-200 hover:border-primary/40 shadow-sm ${isCondemned ? 'bg-red-50/30 border-red-200' : 'bg-white'}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-900 text-lg uppercase leading-tight">{equipment.equipmentName}</h3>
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-1 uppercase">
                <MapPin className="w-3 h-3 text-red-500" /> {equipment.officeName}
              </p>
            </div>
            <button 
              onClick={toggleStatus} 
              disabled={updateStatusMutation.isPending}
              className={`text-[10px] font-black px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                isCondemned 
                ? 'bg-red-600 text-white border-red-700' 
                : 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200'
              }`}
            >
              <Power className="w-3 h-3" /> {equipment.status}
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-3">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Model</p>
              <p className="text-sm font-bold text-slate-700">{equipment.modelNumber || "N/A"}</p>
            </div>
            <div className="border-l border-slate-200 pl-2">
              <p className="text-[9px] font-black text-slate-400 uppercase">Serial</p>
              <p className="text-sm font-bold text-slate-700">{equipment.serialNumber}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-bold text-slate-600 truncate">
                {equipment.installLocation || equipment.installedAt || "Main Office"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-500" />
              <p className="text-xs font-bold text-slate-600">{equipment.repairs?.length || 0} Service Records</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-3 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
          {/* ✅ अब यहाँ N/A की जगह तारीख दिखेगी */}
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {lastUpdateDisplay}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                generateProPDF(equipment); 
              }} 
              className={`h-7 text-xs font-bold ${isCondemned ? 'text-red-600 hover:bg-red-100' : 'text-primary hover:bg-primary/5'}`}
            >
              {isCondemned ? "OFFICIAL PDF" : "PDF"} <Download className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}