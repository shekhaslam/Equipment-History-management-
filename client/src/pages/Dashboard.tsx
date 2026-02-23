import { useQuery } from "@tanstack/react-query";
import { Equipment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, XCircle, Activity } from "lucide-react";

export default function Dashboard() {
  // Database se equipment ki list mangwana stats ke liye
  const { data: equipments, isLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  if (isLoading) return <div className="p-10 font-bold text-center">Loading Stats...</div>;

  // Ginti (Counts) calculate karna
  const total = equipments?.length || 0;
  const active = equipments?.filter(e => e.status === "ACTIVE").length || 0;
  const condemned = equipments?.filter(e => e.status === "CONDEMNED").length || 0;

  return (
    <div className="p-8 bg-slate-50/50 min-h-screen text-left">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Office Overview</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1 text-left">Real-time Asset Summary</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Total Assets Card */}
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Package size={32} /></div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Total Assets</p>
              <h3 className="text-4xl font-black text-slate-900">{total}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Active Units Card */}
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600"><CheckCircle size={32} /></div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Active Units</p>
              <h3 className="text-4xl font-black text-slate-900">{active}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Condemned Units Card */}
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="bg-red-50 p-4 rounded-2xl text-[#D41217]"><XCircle size={32} /></div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Condemned</p>
              <h3 className="text-4xl font-black text-[#D41217]">{condemned}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
           <Activity className="text-blue-500 w-5 h-5" />
           <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight text-left">System Status: <span className="text-emerald-500">Online</span></h2>
        </div>
        <p className="text-slate-500 text-sm font-medium leading-relaxed text-left">
          Dashboard ab aapko pure office ki summary dikha raha hai. Purana detailed data dekhne ke liye Sidebar mein <strong>Inventory Records</strong> par click karein.
        </p>
      </div>
    </div>
  );
}