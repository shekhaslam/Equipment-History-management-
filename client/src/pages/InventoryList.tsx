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
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSetup, setShowSetup] = useState(false);
  const [projectPath, setProjectPath] = useState("C:\\Equipment-History");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        const electron = (window as any).require('electron');
        
        // ✅ Signal sunne ke liye listener (Backend se login success aane par ye chalega)
        electron.ipcRenderer.removeAllListeners('auth-success');
        electron.ipcRenderer.on('auth-success', (_event: any, email: string) => {
          console.log("Login Success Signal Received for:", email);
          setUserEmail(email);
          setIsLoggingIn(false); 
          setShowSetup(false);   
        });

        const defaultPath = await electron.ipcRenderer.invoke('get-app-path');
        if (defaultPath) setProjectPath(defaultPath);
      } catch (e) { 
        console.log("Running in standard browser mode"); 
      }
    };
    initApp();

    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    refetch();
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, [refetch]);

  const handleGoogleLogin = async () => {
    try {
        const electron = (window as any).require('electron');
        setIsLoggingIn(true);
        // Backend handle karega pura login process
        await electron.ipcRenderer.invoke('google-signin');
    } catch (err) {
        console.error("Login Error:", err);
        setIsLoggingIn(false);
    }
  };

  // ✅ Logout Logic jo backend (`main.cjs`) se connect hogi
  const handleLogout = async () => {
    try {
      const electron = (window as any).require('electron');
      // Backend ko 'google-logout' ka signal bhejenge
      const result = await electron.ipcRenderer.invoke('google-logout');
      if (result.success) {
        setUserEmail(null);
        setShowSetup(false);
        alert("Signed out successfully. You can now login with another ID.");
      }
    } catch (err) {
      alert("Error during logout. Please ensure backend is updated.");
    }
  };

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
      "Installed At": eq.installLocation || eq.installedAt || "N/A", 
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

  const isCloudActive = isOnline && userEmail;
  const hasActiveFilters = search !== "" || selectedOffices.length > 0 || selectedEquipmentTypes.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans relative text-left">
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
        <header className="flex flex-col items-center mb-10 relative">
          <div 
            onClick={() => setShowSetup(true)}
            className={`absolute right-0 top-0 cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              isCloudActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCloudActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isCloudActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight">
              {isCloudActive ? "Cloud Active" : "Offline Mode"}
            </span>
          </div>

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

      {showSetup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 border animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-red-50 p-3 rounded-2xl text-red-600"><Settings2 className="w-6 h-6" /></div>
              <button onClick={() => setShowSetup(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <h3 className="text-xl font-black text-slate-900 uppercase mb-4 text-center tracking-tight">Cloud Sync Setup</h3>
            
            {!userEmail ? (
              <div className="space-y-4">
                {!isLoggingIn ? (
                  <>
                    <p className="text-slate-500 text-sm font-medium mb-4 text-center italic text-[11px]">Automatic Backup to Google Drive</p>
                    <Button onClick={handleGoogleLogin} className="w-full h-12 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
                      Sign in with Google
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-10 gap-4 animate-pulse">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-[10px] font-black text-blue-600 uppercase text-center tracking-widest">Waiting for Browser Login...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 animate-in fade-in duration-500">
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mb-2"></div>
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active Account</p>
                  <p className="font-bold text-slate-700 text-lg">{userEmail}</p>
                </div>
                {/* ✅ Added Sign Out Button for Switching IDs */}
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  className="w-full text-red-500 border-red-200 hover:bg-red-50 font-bold"
                >
                  Sign Out / Switch Account
                </Button>
                <p className="text-[10px] text-slate-400 font-bold italic">Your data is being synced automatically.</p>
              </div>
            )}
            
            <Button onClick={() => setShowSetup(false)} className="w-full mt-6 h-10 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 uppercase text-[10px] tracking-widest">Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}