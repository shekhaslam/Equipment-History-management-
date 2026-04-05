import { useEquipmentList } from "@/hooks/use-equipment";
import { EquipmentCard } from "@/components/EquipmentCard";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search, Filter, Download, X, Settings2 } from "lucide-react"; 
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { data: equipmentList, isLoading, refetch } = useEquipmentList();
  const [search, setSearch] = useState("");
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<string[]>([]);
  
  // Filter Logic: Unique Office Names
  const uniqueOffices = useMemo(() => {
    if (!equipmentList) return [];
    return Array.from(new Set(equipmentList.map(item => item.officeName?.trim().toUpperCase()))).filter(Boolean).sort() as string[];
  }, [equipmentList]);

  // Filter Logic: Unique Equipment Types
  const uniqueEquipmentNames = useMemo(() => {
    if (!equipmentList) return [];
    return Array.from(new Set(equipmentList.map(item => item.equipmentName?.trim().toUpperCase()))).filter(Boolean).sort() as string[];
  }, [equipmentList]);

  const filteredList = useMemo(() => {
    return equipmentList?.filter(item => {
      const matchesSearch = (item.equipmentName || "").toLowerCase().includes(search.toLowerCase()) || 
                            (item.serialNumber || "").toLowerCase().includes(search.toLowerCase()) ||
                            (item.officeName || "").toLowerCase().includes(search.toLowerCase());
      const matchesOffice = selectedOffices.length === 0 || selectedOffices.includes(item.officeName?.trim().toUpperCase());
      const matchesEquipment = selectedEquipmentTypes.length === 0 || selectedEquipmentTypes.includes(item.equipmentName?.trim().toUpperCase());
      return matchesSearch && matchesOffice && matchesEquipment;
    });
  }, [equipmentList, search, selectedOffices, selectedEquipmentTypes]);

  const clearFilters = () => {
    setSearch("");
    setSelectedOffices([]);
    setSelectedEquipmentTypes([]);
  };

  const exportToCSV = () => {
    if (!filteredList || filteredList.length === 0) return;
    const data = filteredList.map(eq => ({
      "Office Name": eq.officeName,
      "Division": eq.division,
      "Area": eq.area,
      "Pincode": eq.pincode,
      "Equipment Name": eq.equipmentName,
      "Model Number": eq.modelNumber,
      "Installed At": eq.installedAt || "N/A", 
      "Serial Number": eq.serialNumber,
      "Manufacturing Date": eq.manufacturingDate,
      "Installation Date": eq.installationDate,
      "Usage": eq.usage || eq.monthlyUsage || "N/A",
      "Remarks": eq.remarks,
      "EQUIPMENT STATUS": eq.status || "ACTIVE",
      "Total Repairs": eq.repairs?.length || 0,
      "Total Cost (INR)": eq.repairs?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0).toFixed(2)
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Post_Equipment_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const hasActiveFilters = search !== "" || selectedOffices.length > 0 || selectedEquipmentTypes.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans relative text-left">
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
        <header className="flex flex-col items-center mb-10 relative">

          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-3">
            <img src="/assets/india-post-logo.png" alt="India Post" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-black text-[#D41217] tracking-tighter uppercase text-center">Department of Posts</h1>
          <p className="text-slate-500 font-bold text-[11px] tracking-[0.2em] uppercase text-center">Equipment History Management</p>
        </header>

        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-11 pr-10 h-10 bg-transparent text-base font-bold outline-none" placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
          </div>
          
          <div className="flex gap-2 w-full md:w-auto px-2">
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="h-9 px-3 gap-2 font-black text-[10px] uppercase text-red-600">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-9 px-3 gap-2 font-bold text-slate-600"><Filter className="w-4 h-4" /> Filters</Button></DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-white border shadow-xl rounded-xl" align="end">
                <DropdownMenuLabel className="font-black text-[10px] uppercase p-2">Office Name</DropdownMenuLabel>
                <div className="max-h-40 overflow-y-auto">
                  {uniqueOffices.map(office => (
                    <DropdownMenuCheckboxItem key={office} checked={selectedOffices.includes(office)} onCheckedChange={(c) => setSelectedOffices(p => c ? [...p, office] : p.filter(o => o !== office))} className="text-xs font-bold uppercase">{office}</DropdownMenuCheckboxItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-black text-[10px] uppercase p-2">Equipment Name</DropdownMenuLabel>
                <div className="max-h-40 overflow-y-auto">
                  {uniqueEquipmentNames.map(eq => (
                    <DropdownMenuCheckboxItem key={eq} checked={selectedEquipmentTypes.includes(eq)} onCheckedChange={(c) => setSelectedEquipmentTypes(p => c ? [...p, eq] : p.filter(e => e !== eq))} className="text-xs font-bold uppercase">{eq}</DropdownMenuCheckboxItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" onClick={exportToCSV} className="h-9 px-3 gap-2 font-bold text-slate-600"><Download className="w-4 h-4" /> Export</Button>
            <Separator orientation="vertical" className="h-6 self-center hidden md:block mx-1" />
            <Link href="/create"><Button className="h-9 px-5 gap-2 bg-[#D41217] text-white font-bold rounded-lg shadow-sm"><Plus className="w-4 h-4" /> New Sheet</Button></Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-20 gap-3"><Loader2 className="w-8 h-8 animate-spin text-red-500" /><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Loading...</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredList?.map((item) => <EquipmentCard key={item.id} equipment={item} />)}
          </div>
        )}
      </div>

    </div>
  );
}