import { useQuery, useMutation } from "@tanstack/react-query";
import { Equipment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, XCircle, Activity, Ticket, Clock, CheckCircle2, Settings2, X, Loader2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function Dashboard({ userEmail, setUserEmail }: { userEmail: string | null, setUserEmail: (e: string | null) => void }) {
  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSetup, setShowSetup] = useState(false);
  const [projectPath, setProjectPath] = useState("C:\\Equipment-History");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginStep, setLoginStep] = useState<'ENTRY' | 'VERIFY' | 'DESC' | 'SUCCESS'>('ENTRY');

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    // Auto-load path
    const loadPath = async () => {
       try {
         const electron = (window as any).require('electron');
         const defaultPath = await electron.ipcRenderer.invoke('get-app-path');
         if (defaultPath) setProjectPath(defaultPath);
       } catch(e) {}
    };
    loadPath();

    const pollTickets = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
    }, 30000); // 30 seconds auto-refresh

    const autoSync = setInterval(async () => {
      if (navigator.onLine && userEmail) {
        try {
          const electron = (window as any).require('electron');
          await electron.ipcRenderer.invoke('sync-to-cloud');
          console.log("Auto-Synced to Cloud at:", new Date().toLocaleTimeString());
        } catch (e) { console.log("Cloud sync skipped - Browser mode"); }
      }
    }, 60000); // 1 minute auto-sync

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      clearInterval(pollTickets);
      clearInterval(autoSync);
    };
  }, [userEmail]);

  const handleGoogleLogin = async () => {
    console.log("🚀 User clicked Google Login");
    try {
      const electron = (window as any).require('electron');
      setIsLoggingIn(true);
      await electron.ipcRenderer.invoke('initiate-google-login');
      // No transition to VERIFY needed, we wait for 'google-auth-success' event
      toast({ title: "Google OAuth Launched", description: "Please complete login in your web browser." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to initiate Google Login.", variant: "destructive" });
      setIsLoggingIn(false);
    }
  };

  const confirmVerification = async () => {
    if (verificationCode.length !== 6) {
      toast({ title: "Invalid Code", description: "Enter the 6-digit code from the Security Alert page.", variant: "destructive" });
      return;
    }

    try {
        const electron = (window as any).require('electron');
        setIsLoggingIn(true);
        const result = await electron.ipcRenderer.invoke('google-signin', loginEmail, verificationCode);
        if (!result.success) {
          toast({ title: "Login Failed", description: result.error, variant: "destructive" });
          setIsLoggingIn(false);
        } else {
          setLoginStep('DESC');
        }
    } catch (err) {
        toast({ title: "Login Error", description: "Electron error.", variant: "destructive" });
        setIsLoggingIn(false);
    }
  };

  const finalizeLogin = async () => {
    try {
      const electron = (window as any).require('electron');
      await electron.ipcRenderer.invoke('save-google-session', { email: userEmail }); // Using simplified session for now
      await electron.ipcRenderer.invoke('send-disclosure-email', userEmail);
    } catch (e) { console.error("Disclosure email/session failed"); }
    
    setShowSetup(false);
    setLoginStep('SUCCESS');
    queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
    toast({ title: "Access Granted", description: `Account ${userEmail} is now linked.` });
  };

  const handleLogout = async () => {
    try {
      const electron = (window as any).require('electron');
      await electron.ipcRenderer.invoke('google-logout');
      setUserEmail(null);
      setLoginEmail("");
      setLoginStep('ENTRY');
      setShowSetup(false);
      toast({ title: "Signed Out" });
    } catch (err) { console.error(err); }
  };

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveData, setResolveData] = useState({
    date: new Date().toISOString().split('T')[0],
    nature: "Verified Repair",
    vendorName: "",
    invoiceNo: "",
    amount: "0",
    remarks: ""
  });

  const { data: equipments, isLoading: isEqLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: tickets, isLoading: isTicketsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tickets"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const mutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const payloadDate = resolveData.date ? resolveData.date.split('-').reverse().join('-') : new Date().toLocaleDateString('en-GB'); // Convert YYYY-MM-DD to DD-MM-YYYY
      const res = await apiRequest("POST", `/api/admin/tickets/${ticketId}/resolve`, {
        ...resolveData,
        date: payloadDate
      });

      // SYNC TO CLOUD IF NEEDED
      const ticket = tickets?.find(t => t.id === ticketId);
      if (ticket && ticket.ticketNo.startsWith('ER-')) {
          console.log("☁️ Syncing Resolution to Cloud:", ticket.ticketNo);
          const electron = (window as any).require('electron');
          await electron.ipcRenderer.invoke('update-cloud-ticket-status', {
              ticketNo: ticket.ticketNo,
              status: 'RESOLVED',
              ...resolveData,
              date: payloadDate
          });
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setShowResolveDialog(false);
      setSelectedTicket(null);
      toast({ title: "RESOLVED", description: "Marked as resolved. Check specific machine for service log." });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, ticketNo }: { id: number, status: string, ticketNo?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/tickets/${id}/status`, { status, ticketNo });
      return res;
    },
    onSuccess: (_, variables) => {
      if (variables.ticketNo && variables.ticketNo.startsWith('ER-')) {
          console.log("☁️ Syncing Status to Cloud:", variables.ticketNo, variables.status);
          const electron = (window as any).require('electron');
          electron.ipcRenderer.invoke('update-cloud-ticket-status', {
              ticketNo: variables.ticketNo,
              status: variables.status.toUpperCase()
          }).catch(console.error);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      toast({ title: "STATUS UPDATED", description: `Ticket is now in ${variables.status} state.` });
    }
  });

  const manualSyncMutation = useMutation({
    mutationFn: () => {
      // Use the same require('electron') pattern as other functions
      const electron = (window as any).require('electron');
      return electron.ipcRenderer.invoke('manual-cloud-sync');
    },
    onSuccess: (data: any) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
        toast({ title: "CLOUD REFRESH", description: "All data synced successfully." });
      } else {
        toast({ title: "SYNC FAILED", description: data.error || "Unknown Error", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "SYNC FAILED", description: err.message || "Could not connect to Cloud Bridge.", variant: "destructive" });
    }
  });

  if (isEqLoading || isTicketsLoading) return <div className="p-10 font-bold text-center">Loading Stats...</div>;

  const total = equipments?.length || 0;
  const active = equipments?.filter(e => e.status === "ACTIVE").length || 0;
  const condemned = equipments?.filter(e => e.status === "CONDEMNED").length || 0;

  const isCloudActive = isOnline && userEmail;

  return (
    <div className="p-8 bg-slate-50/50 min-h-screen text-left relative">
      <div className="mb-8 flex justify-between items-end text-left">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Office Overview</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Asset Summary</p>
        </div>
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setShowSetup(true)}
             className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all shadow-sm ${
                isCloudActive ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              }`}
          >
            <div className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCloudActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCloudActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                {isCloudActive ? "Cloud Sync Active" : (isOnline ? "Cloud Login Pending" : "Offline Mode")}
            </span>
          </div>

          {isOnline && (
            <Button
              onClick={() => {
                if (!userEmail) {
                  setShowSetup(true);
                  toast({ title: "CLOUD SETUP REQUIRED", description: "Please sign in with Google to enable Cloud Sync." });
                } else {
                  manualSyncMutation.mutate();
                }
              }}
              disabled={manualSyncMutation.isPending}
              variant="outline"
              className="rounded-2xl border-emerald-200 text-emerald-700 bg-emerald-50 h-10 px-4 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 shadow-sm"
            >
              {manualSyncMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Wifi size={14} className="mr-2" />}
              Force Cloud Sync
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden text-left">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Package size={32} /></div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Assets</p>
              <h3 className="text-4xl font-black text-slate-900">{total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden text-left">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600"><CheckCircle size={32} /></div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Units</p>
              <h3 className="text-4xl font-black text-slate-900">{active}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden text-left">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="bg-red-50 p-4 rounded-2xl text-[#D41217]"><XCircle size={32} /></div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Condemned</p>
              <h3 className="text-4xl font-black text-[#D41217]">{condemned}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-10 text-left">
        <div className="flex items-center gap-2 mb-6 text-left">
          <Ticket className="text-[#D41217] w-6 h-6" />
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Pending Service Tickets ({tickets?.length || 0})</h2>
        </div>

        {(!tickets || tickets.length === 0) ? (
          <Card className="border-dashed border-2 border-slate-200 bg-transparent rounded-[2.5rem] p-12 text-center">
            <p className="text-slate-400 font-bold uppercase tracking-widest">No pending tickets. All machines are healthy!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {tickets.map(ticket => (
              <Card key={ticket.id} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden group hover:shadow-lg transition-all text-left">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-lg",
                      ticket.status === 'processing' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-[#D41217]"
                    )}>
                      {ticket.status === 'processing' ? <Activity size={14} /> : <Clock size={14} />}
                      <span className="text-[10px] font-black uppercase">
                        {ticket.status === 'processing' ? `PROCESSING | ${ticket.ticketNo}` : ticket.ticketNo}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">
                      {ticket.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-slate-900 uppercase text-lg line-clamp-1">
                      {ticket.equipmentName}
                    </h4>
                    {ticket.fault && (
                        <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            {ticket.fault}
                        </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-4">
                    S/N: {ticket.serialNumber} | {ticket.officeName}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6 font-medium text-xs text-slate-600 italic">
                    "{ticket.issueDescription}"
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/50 -m-6 mt-0 p-4 px-6 border-t border-slate-100 flex-wrap gap-4">
                    <div className="flex flex-col min-w-[120px]">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Reporter</p>
                      <p className="text-xs font-bold text-slate-600 truncate">{ticket.reporterName}</p>
                      <p className="text-[9px] font-bold text-slate-500 truncate mt-0.5">
                        {ticket.reporterBranch || "Unknown Branch"} {ticket.reporterMobile && `• ${ticket.reporterMobile}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {ticket.status === 'pending' && (
                        <Button
                          onClick={() => statusMutation.mutate({ id: ticket.id, status: 'processing', ticketNo: ticket.ticketNo })}
                          disabled={statusMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase h-8 px-4 rounded-lg shadow-sm"
                        >
                          Start Processing
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowResolveDialog(true);
                        }}
                        disabled={mutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase h-8 px-4 rounded-lg shadow-sm"
                      >
                        <CheckCircle2 size={14} className="mr-2" /> 
                        {ticket.status === 'processing' ? "Complete & Resolve" : "Resolve Ticket"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                 <p className="text-white/60 text-[10px] font-bold mt-1 uppercase tracking-widest">{selectedTicket?.ticketNo} | {selectedTicket?.equipmentName}</p>
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
                            value={resolveData.date}
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



      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl text-left">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-emerald-500 w-5 h-5" />
          <h2 className="text-lg font-black uppercase tracking-tight">System Guidance</h2>
        </div>
        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
          Jab koi user QR code scan karke report submit karega, woh yahan <strong>Service Tickets</strong> section mein dikhai dega.
          "Resolve & Log" par click karte hi woh auto-repair ban kar machine ki history mein save ho jayega. <strong>Invoice details</strong> aur <strong>Remarks</strong> future audit ke liye surakshit rahenge.
        </p>
      </div>

      {/* SETUP MODAL for Google Drive / Offline Sync */}
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
                {loginStep === 'ENTRY' && (
                  <>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 ml-1 text-left">Gmail Account</p>
                    <input 
                      type="email" 
                      placeholder="e.g. yourname@gmail.com" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500/20 mb-4 transition-all"
                    />
                    <Button onClick={handleGoogleLogin} className="w-full h-12 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
                      Sign in with Google
                    </Button>
                  </>
                )}

                {isLoggingIn && loginStep === 'ENTRY' && (
                  <div className="text-center py-6 animate-pulse">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-[12px] font-bold text-slate-600">Waiting for Google Authentication...</p>
                    <p className="text-[10px] text-slate-400 mt-2 italic">Please check your system browser</p>
                  </div>
                )}

                {loginStep === 'DESC' && (
                  <div className="animate-in slide-in-from-bottom-2 duration-300">
                     <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl mb-6">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Data Privacy & Usage</h4>
                        <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                          Hum aapki Gmail ID ka upyog sirf application data ko <strong>Google Drive</strong> mein surakshit save karne ke liye karenge. 
                          Aapke reports, tickets aur inventory records ka cloud backup isi ID par banaya jayega taki machine repair history hamesha available rahe.
                        </p>
                     </div>
                     <Button onClick={finalizeLogin} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg uppercase tracking-widest text-xs">
                       Confirm & Allow Access
                     </Button>
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