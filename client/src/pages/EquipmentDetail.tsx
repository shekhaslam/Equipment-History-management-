import { useRoute, Link, useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useEquipment, useDeleteEquipment } from "@/hooks/use-equipment";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { generateProPDF, generateServiceLogPDF } from "@/lib/pdfGenerator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { RepairTable } from "@/components/RepairTable";
import { ArrowLeft, Printer, FileText, Download, QrCode, Trash2, Edit3, Save, Calendar, Wrench, MapPin, Activity, Loader2, Clock, CheckCircle2, Tag, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EquipmentDetail() {
  const [, params] = useRoute("/equipment/:id");
  const id = params?.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();

  const { data: equipment, isLoading } = useEquipment(id);
  const deleteMutation = useDeleteEquipment();

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveData, setResolveData] = useState({
    date: new Date().toISOString().split('T')[0],
    nature: "Verified Repair", vendorName: "", invoiceNo: "", amount: "0", remarks: ""
  });

  const mutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const payloadDate = resolveData.date ? resolveData.date.split('-').reverse().join('-') : new Date().toLocaleDateString('en-GB'); // Convert YYYY-MM-DD to DD-MM-YYYY
      const res = await apiRequest("POST", `/api/admin/tickets/${ticketId}/resolve`, {
        ...resolveData,
        date: payloadDate
      });

      const ticket = ((equipment as any).tickets || []).find((t:any) => t.id === ticketId);
      if (ticket && ticket.ticketNo.startsWith('ER-')) {
          try {
            const electron = (window as any).require('electron');
            await electron.ipcRenderer.invoke('update-cloud-ticket-status', {
                ticketNo: ticket.ticketNo,
                status: 'RESOLVED'
            });
          } catch(e) {}
      }
      return res;
    },
    onSuccess: () => {
      setShowResolveDialog(false);
      setSelectedTicket(null);
      window.location.reload();
    }
  });

  const swipeMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await apiRequest("POST", `/api/admin/tickets/${ticketId}/swipe`);
      return res;
    },
    onSuccess: () => {
      window.location.reload();
    }
  });

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      setLocation("/inventory");
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 animate-spin text-primary" /></div>;
  if (!equipment) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="mx-auto max-w-[98%] px-4 py-8">
        <PageHeader 
          title={equipment.equipmentName} 
          description={`${equipment.modelNumber} — ${equipment.serialNumber}`}
          backUrl="/inventory"
          actions={
            <div className="flex gap-2">
              {/* ✅ STEP 2 FIXED: Ab ye seedha generateProPDF ko call karega jisme Logo aur saari details hain */}
              
<Button 
  variant="outline" 
  onClick={() => setLocation(`/qr-management?search=${equipment.serialNumber}&print=true`)}
  className="gap-2 border-slate-200 text-slate-600 font-bold h-10 px-4 rounded-xl hover:bg-slate-50"
>
  <QrCode className="w-4 h-4" /> Print QR Label
</Button>
<Button 
  className="gap-2 bg-white border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 h-10 px-4 rounded-xl shadow-sm"
  onClick={() => generateProPDF(equipment)}
>
  <FileText className="w-4 h-4 ml-0.5" /> Download History Sheet (Pro)
</Button>

              <Link href={`/equipment/${id}/edit`}>
                <Button variant="outline" className="gap-2"><Edit3 className="w-4 h-4" /> Edit</Button>
              </Link>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the record.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 space-y-6">
            {/* 1. Main Repair history Table */}
            <Card className="shadow-md border-border/50 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Printer className="w-5 h-5 text-primary" /> Active Maintenance Record
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RepairTable 
                   repairs={(equipment.repairs || []).sort((a:any, b:any) => {
                     const dateA = new Date(a.date).getTime();
                     const dateB = new Date(b.date).getTime();
                     return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
                   })} 
                   readOnly={true} 
                   onChange={() => {}} 
                />
              </CardContent>
            </Card>

            {/* 2. PENDING TICKETS SECTION */}
            {(((equipment as any).tickets || []).filter((t:any) => t.status === 'pending').length > 0) && (
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2 px-2">
                  <Clock className="w-5 h-5 text-red-500" /> Pending Maintenance Requests
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {((equipment as any).tickets || []).filter((t:any) => t.status === 'pending').map((ticket:any) => (
                    <Card key={ticket.id} className="border-2 border-red-100 bg-red-50/10 shadow-sm overflow-hidden group">
                      <CardContent className="p-5 flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-md">{ticket.ticketNo}</span>
                            <span className="text-[10px] font-bold text-slate-400">{ticket.createdAt}</span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm italic">"{ticket.issueDescription}"</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Reported by: {ticket.reporterName}</p>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowResolveDialog(true);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase h-8 px-4 rounded-lg shadow-md"
                        >
                          Resolve Ticket
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* 3. RESOLVED TICKETS SECTION */}
            {(((equipment as any).tickets || []).filter((t:any) => t.status === 'resolved').length > 0) && (
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2 px-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Resolved Tickets Log
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {((equipment as any).tickets || []).filter((t:any) => t.status === 'resolved').map((ticket:any) => (
                    <Card key={ticket.id} className="border-2 border-emerald-100 bg-emerald-50/10 shadow-sm overflow-hidden group">
                      <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md">{ticket.ticketNo}</span>
                            <span className="text-[10px] font-bold text-slate-400">{ticket.createdAt}</span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm italic">"{ticket.issueDescription}"</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Reported by: {ticket.reporterName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           <Button
                             variant="outline"
                             className="text-slate-700 font-bold text-[10px] uppercase h-8 px-4 rounded-lg shadow-sm border-slate-200 hover:bg-slate-50"
                             onClick={() => {
                               const repairDetails = equipment.repairs?.find((r:any) => r.remarks?.includes(ticket.ticketNo));
                               generateServiceLogPDF(equipment, ticket, repairDetails);
                             }}
                           >
                             <Printer className="w-4 h-4 mr-1"/> Log PDF
                           </Button>
                           <Button
                             onClick={() => swipeMutation.mutate(ticket.id)}
                             disabled={swipeMutation.isPending}
                             className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase h-8 px-4 rounded-lg shadow-md flex items-center gap-1"
                           >
                              {swipeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                             Merge Final
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* RESOLUTION DIALOG */}
            {showResolveDialog && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                 <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="bg-[#D41217] p-8 text-white relative">
                       <div className="flex items-center gap-3 mb-2">
                          <CheckCircle2 size={20} className="text-white/80" />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Official Resolution</p>
                       </div>
                       <h3 className="text-2xl font-black uppercase tracking-tight">Resolve Ticket</h3>
                       <p className="text-white/60 text-[10px] font-bold mt-1 uppercase tracking-widest">{selectedTicket?.ticketNo} | {equipment?.equipmentName}</p>
                       <button onClick={() => setShowResolveDialog(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
                          <XCircle size={24} />
                       </button>
                    </div>

                    <div className="p-8 space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Resolution Date</label>
                              <input 
                                  type="date"
                                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-[#D41217] outline-none tracking-widest uppercase"
                                  value={(resolveData as any).date}
                                  onChange={e => setResolveData({...resolveData, date: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nature of Work</label>
                              <input 
                                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-[#D41217] outline-none"
                                  value={resolveData.nature}
                                  onChange={e => setResolveData({...resolveData, nature: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cost (INR)</label>
                              <input 
                                  placeholder="0"
                                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-[#D41217] outline-none"
                                  value={resolveData.amount}
                                  onChange={e => setResolveData({...resolveData, amount: e.target.value})}
                              />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Vendor/Company</label>
                              <input 
                                  placeholder="e.g. HP Service Center"
                                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-[#D41217] outline-none"
                                  value={resolveData.vendorName}
                                  onChange={e => setResolveData({...resolveData, vendorName: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Invoice Number</label>
                              <input 
                                  placeholder="Optional"
                                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-[#D41217] outline-none"
                                  value={resolveData.invoiceNo}
                                  onChange={e => setResolveData({...resolveData, invoiceNo: e.target.value})}
                              />
                          </div>
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Technical Remarks</label>
                          <textarea 
                              placeholder="Explain what was fixed or replaced..."
                              className="w-full min-h-[100px] bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium text-slate-600 focus:border-[#D41217] outline-none resize-none"
                              value={resolveData.remarks}
                              onChange={e => setResolveData({...resolveData, remarks: e.target.value})}
                          />
                       </div>

                       <div className="pt-4 flex gap-3">
                          <Button 
                              onClick={() => mutation.mutate(selectedTicket.id)}
                              disabled={mutation.isPending}
                              className="flex-1 h-12 bg-slate-900 hover:bg-black text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg transition-all"
                          >
                              {mutation.isPending ? <Loader2 className="animate-spin" /> : "Finalize & Save to History"}
                          </Button>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Card className="shadow-md border-border/50 bg-white/80">
              <CardHeader><CardTitle className="text-lg">Equipment Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="font-medium text-slate-900">{equipment.officeName}</p>
                      <p className="text-sm text-muted-foreground">{equipment.area} - {equipment.pincode}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Division</p>
                      <p className="font-medium text-slate-900">{equipment.division}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Usage / Refill</p>
                      <p className="font-medium text-slate-900">{equipment.monthlyUsage || "N/A"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Dates</p>
                      <p className="text-xs text-slate-600">Mfg: {equipment.manufacturingDate || "N/A"}</p>
                      <p className="text-xs text-slate-600">Inst: {equipment.installationDate || "N/A"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Installed At (Branch)</p>
                    <p className="text-sm font-medium text-slate-900">{equipment.installedAt || "N/A"}</p>
                  </div>
                  {equipment.remarks && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Remarks</p>
                        <p className="text-sm italic text-slate-600">{equipment.remarks}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10 shadow-inner">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Repairs</p>
                  <p className="text-2xl font-bold text-primary">{equipment.repairs?.length || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{(equipment.repairs || []).reduce((acc:any, curr:any) => acc + (parseFloat(curr.amount) || 0), 0).toFixed(2) || "0.00"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}