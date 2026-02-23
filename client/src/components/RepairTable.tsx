import { InsertRepair } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calendar, Wrench, IndianRupee, Tool } from "lucide-react";

interface RepairTableProps {
  repairs: Partial<InsertRepair>[];
  onChange: (repairs: Partial<InsertRepair>[]) => void;
  readOnly?: boolean;
}

export function RepairTable({ repairs, onChange, readOnly = false }: RepairTableProps) {
  const addRow = () => {
    onChange([...repairs, { date: "", natureOfRepair: "", amount: "" }]);
  };

  const updateRow = (index: number, field: keyof InsertRepair, value: string) => {
    const newRepairs = [...repairs];
    newRepairs[index] = { ...newRepairs[index], [field]: value };
    onChange(newRepairs);
  };

  const removeRow = (index: number) => {
    const newRepairs = repairs.filter((_, i) => i !== index);
    onChange(newRepairs);
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Container (Clean Modern Card) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
        
        {/* Professional Header with Icons */}
        <div className="grid grid-cols-[180px_1fr_140px_40px] gap-6 mb-4 px-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Date of Service
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Wrench className="w-3 h-3" /> Nature of Maintenance
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 justify-end">
            <IndianRupee className="w-3 h-3" /> Cost (INR)
          </span>
          <span></span>
        </div>

        {/* Repairs List with Icons Inside Fields */}
        <div className="space-y-4">
          {repairs.length === 0 ? (
            <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 transition-all">
              <Wrench className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400 italic font-medium">No technical service records found.</p>
            </div>
          ) : (
            repairs.map((repair, index) => (
              <div key={index} className="grid grid-cols-[180px_1fr_140px_40px] gap-6 items-center group animate-in slide-in-from-left-2 duration-300">
                {/* Date Input with Calendar Icon */}
                <div className="relative">
                  <Input
                    type="date"
                    value={repair.date || ""}
                    disabled={readOnly}
                    onChange={(e) => updateRow(index, "date", e.target.value)}
                    className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-primary/10 rounded-xl text-sm font-medium transition-all"
                  />
                </div>

                {/* Description Input with Wrench Placeholder Feel */}
                <div className="relative">
                  <Input
                    value={repair.natureOfRepair || ""}
                    disabled={readOnly}
                    placeholder="Describe maintenance work (e.g. Fuser replacement)..."
                    onChange={(e) => updateRow(index, "natureOfRepair", e.target.value)}
                    className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-primary/10 rounded-xl text-sm"
                  />
                </div>

                {/* Amount Input with Fixed Rupee Symbol Feel */}
                <div className="relative group/amount">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</div>
                  <Input
                    type="number"
                    value={repair.amount || ""}
                    disabled={readOnly}
                    placeholder="0.00"
                    onChange={(e) => updateRow(index, "amount", e.target.value)}
                    className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white pl-7 text-right font-mono text-sm font-bold text-primary rounded-xl transition-all"
                  />
                </div>

                {/* Remove Button - Stylish Red */}
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 rounded-xl"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* 2. Sleek Dashed Add Button (Pro Look) */}
        {!readOnly && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={addRow}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-slate-50/80 transition-all font-bold text-sm group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> 
              Add New Technical Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}