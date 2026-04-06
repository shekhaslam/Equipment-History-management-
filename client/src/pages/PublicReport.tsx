import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Download, ArrowLeft, CheckCircle2, ShieldAlert, BadgeCheck, Clock } from "lucide-react";
import html2pdf from "html2pdf.js";

export default function PublicReport() {
  const queryParams = new URLSearchParams(window.location.search);
  const equipmentId = queryParams.get("id");
  const { toast } = useToast();

  const [ticketData, setTicketData] = useState<any>(null);
  const [selectedAssetType, setSelectedAssetType] = useState("");
  const [formData, setFormData] = useState({
    reporterName: "",
    branchName: "",
    mobile: "",
    issueType: "",
    issueDescription: ""
  });

  const { data: equipment, isLoading } = useQuery<any>({
    queryKey: [`/api/public/equipment/${equipmentId}`],
    enabled: !!equipmentId
  });

  const faultCategories: Record<string, string[]> = {
    "Printer": ["Paper Jam", "Light Print", "Toner Low", "Not Powering On"],
    "CPU/Desktop": ["System Hanging", "Blue Screen Error", "Not Starting"],
    "Thermal Printer": ["Cutter Jam", "Receipt Not Printing", "Red Light Error"],
    "UPS/Network": ["No Backup", "No Internet", "Power Trip"],
    "Other": ["General Fault", "Physical Damage"]
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/public/report", {
        equipmentId: Number(equipmentId),
        reporterName: `${data.reporterName} (Tel: ${data.mobile})`,
        reporterMobile: data.mobile,
        reporterBranch: data.branchName,
        fault: selectedAssetType, 
        issueType: data.issueType, // Send specific fault separately
        issueDescription: data.issueDescription,
        priority: "medium"
      });
      return res.json();
    },
    onSuccess: (serverData) => {
      const timestamp = new Date().toLocaleString('en-IN', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });

      const newTicket = {
        ...formData,
        ticketNo: serverData.ticketNo,
        timestamp: timestamp
      };
      setTicketData(newTicket);
      
      // ✅ SAVE TO LOCAL STORAGE (Recent Reports)
      try {
        const recent = JSON.parse(localStorage.getItem("dop_recent_reports") || "[]");
        const updated = [newTicket, ...recent.filter((t:any) => t.ticketNo !== newTicket.ticketNo)].slice(0, 5);
        localStorage.setItem("dop_recent_reports", JSON.stringify(updated));
      } catch (e) {}

      toast({ title: "SUCCESS", description: "Your report has been received officially." });
      
      // ✅ AUTO DOWNLOAD PDF
      setTimeout(() => {
        generatePDF(newTicket);
      }, 1000);
    },
    onError: (error: any) => {
      console.error("Submission Error:", error);
      toast({ 
        title: "SUBMISSION FAILED", 
        description: `Could not reach server. Error: ${error.message || "Unknown Network Error"}. Check connection or IP.`, 
        variant: "destructive" 
      });
    }
  });

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd);
    mutation.mutate(data);
  };

  const generatePDF = () => {
    const pdfContent = `
      <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #1e293b;">
        <div style="display: flex; align-items: center; border-bottom: 4px solid #D41217; padding-bottom: 20px; margin-bottom: 30px; justify-content: space-between;">
          <div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; color: #D41217;">India Post</h1>
            <p style="margin: 2px 0 0; font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 3px;">OFFICIAL MAINTENANCE AUDIT</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 10px; font-weight: 900;">TICKET ID</p>
            <p style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a;">${ticketData.ticketNo}</p>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px; font-size: 12px; font-weight: 900; color: #64748b; letter-spacing: 1px;">DEVICE INFORMATION</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <p style="font-size: 10px; color: #94a3b8; margin: 0;">EQUIPMENT</p>
              <p style="font-weight: 800; font-size: 14px; margin: 4px 0;">${equipment.equipmentName}</p>
            </div>
            <div>
              <p style="font-size: 10px; color: #94a3b8; margin: 0;">SERIAL NUMBER</p>
              <p style="font-weight: 800; font-size: 14px; margin: 4px 0;">${equipment.serialNumber}</p>
            </div>
          </div>
        </div>

        <div style="border: 2px solid #0f172a; border-radius: 25px; padding: 30px; margin-bottom: 30px; position: relative; overflow: hidden;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900; color: #64748b; text-align: center; text-transform: uppercase;">Tracking Status: <span style="color: #059669;">REGISTERED</span></h2>
          <div style="margin: 20px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">REPORTED BY:</td><td align="right" style="font-weight: 800;">${ticketData.reporterName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">OFFICE:</td><td align="right" style="font-weight: 800;">${ticketData.branchName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">FAULT TYPE:</td><td align="right" style="font-weight: 800; color: #D41217;">${ticketData.issueType}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">TIMESTAMP:</td><td align="right" style="font-weight: 800;">${ticketData.timestamp}</td></tr>
            </table>
          </div>
          <p style="font-size: 9px; text-align: center; color: #94a3b8; margin: 0;">Verified Digital Copy - No Signature Required</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Report_${ticketData.ticketNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(pdfContent).set(opt).save();
  };

  const generatePDFForRecent = (ticket: any) => {
    // Helper to generate PDF from stored recent ticket data
    const pdfContent = `
      <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #1e293b;">
        <div style="display: flex; align-items: center; border-bottom: 4px solid #D41217; padding-bottom: 20px; margin-bottom: 30px; justify-content: space-between;">
          <div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; color: #D41217;">India Post</h1>
            <p style="margin: 2px 0 0; font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 3px;">OFFICIAL MAINTENANCE AUDIT</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 10px; font-weight: 900;">TICKET ID</p>
            <p style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a;">${ticket.ticketNo}</p>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px; font-size: 12px; font-weight: 900; color: #64748b; letter-spacing: 1px;">DEVICE INFORMATION</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <p style="font-size: 10px; color: #94a3b8; margin: 0;">EQUIPMENT</p>
              <p style="font-weight: 800; font-size: 14px; margin: 4px 0;">${equipment.equipmentName}</p>
            </div>
            <div>
              <p style="font-size: 10px; color: #94a3b8; margin: 0;">SERIAL NUMBER</p>
              <p style="font-weight: 800; font-size: 14px; margin: 4px 0;">${equipment.serialNumber}</p>
            </div>
          </div>
        </div>

        <div style="border: 2px solid #0f172a; border-radius: 25px; padding: 30px; margin-bottom: 30px; position: relative; overflow: hidden;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900; color: #64748b; text-align: center; text-transform: uppercase;">Tracking Status: <span style="color: #059669;">REGISTERED</span></h2>
          <div style="margin: 20px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">REPORTED BY:</td><td align="right" style="font-weight: 800;">${ticket.reporterName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">OFFICE:</td><td align="right" style="font-weight: 800;">${ticket.branchName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">FAULT TYPE:</td><td align="right" style="font-weight: 800; color: #D41217;">${ticket.issueType}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">TIMESTAMP:</td><td align="right" style="font-weight: 800;">${ticket.timestamp}</td></tr>
            </table>
          </div>
          <p style="font-size: 9px; text-align: center; color: #94a3b8; margin: 0;">Verified Digital Copy - No Signature Required</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Report_${ticket.ticketNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(pdfContent).set(opt).save();
  };

  const recentReports = JSON.parse(localStorage.getItem("dop_recent_reports") || "[]");

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-red-600" /></div>;
  if (!equipment) return <div className="p-10 text-center font-black uppercase text-red-600">Invalid QR Code</div>;

  return (
    <div className="min-h-screen bg-[#fcfcfd] p-4 flex flex-col items-center font-display">
      <div className="w-full max-w-xl bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden border border-slate-100">

        {/* Banner */}
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/assets/pattern.png')] bg-repeat"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white p-3 rounded-2xl mb-4 shadow-xl">
              <img src="/assets/india-post-logo.png" alt="DOP" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-white text-2xl font-black uppercase tracking-tighter">India Post</h1>
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Maintenance Management</p>
          </div>
        </div>

        <div className="p-8 md:p-12">
          {!ticketData ? (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Asset</p>
                <h2 className="text-xl font-black text-slate-900 uppercase leading-none">{equipment.equipmentName}</h2>
                <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200/50">
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">S/N</p>
                    <p className="text-xs font-black text-slate-700">{equipment.serialNumber}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Office</p>
                    <p className="text-xs font-black text-slate-700">{equipment.officeName}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="flex items-center gap-2 mb-2 ml-1">
                  <ShieldAlert size={14} className="text-red-600" />
                  <span className="text-[11px] font-black uppercase text-slate-500">Report an Issue</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input name="reporterName" placeholder="Your Name" required className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold" value={formData.reporterName} onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })} />
                  <Input name="branchName" placeholder="Branch/Office" required className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold" value={formData.branchName} onChange={(e) => setFormData({ ...formData, branchName: e.target.value })} />
                </div>
                <Input name="mobile" placeholder="Mobile Number (Optional)" maxLength={10} className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />

                <div className="space-y-4 pt-2">
                  <select
                    onChange={(e) => setSelectedAssetType(e.target.value)}
                    required
                    className="w-full h-14 rounded-2xl bg-slate-50 border-none px-6 text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Select Category...</option>
                    {Object.keys(faultCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  {selectedAssetType && (
                    <select
                      name="issueType"
                      required
                      className="w-full h-14 rounded-2xl bg-slate-50 border-none px-6 text-sm font-bold animate-in fade-in slide-in-from-top-2"
                      value={formData.issueType}
                      onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                    >
                      <option value="">Select Specific Fault...</option>
                      {faultCategories[selectedAssetType].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  )}
                </div>

                <Textarea name="issueDescription" placeholder="Can you describe the issue briefly?" required className="min-h-[120px] rounded-[1.5rem] bg-slate-50 border-none p-6 font-medium" value={formData.issueDescription} onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })} />

                <Button type="submit" disabled={mutation.isPending} className="w-full bg-[#D41217] hover:bg-red-700 h-16 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-red-200 transition-all active:scale-95 disabled:opacity-50">
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : "Submit To Server"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-10 text-center animate-in zoom-in-95 duration-500">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <BadgeCheck size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Report Logged</h2>
                <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest">Official Tracking ID Generated</p>
              </div>

              <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-4">Official Receipt ID</p>
                <h3 className="text-5xl font-black tracking-tighter mb-4 text-white">
                  {ticketData.ticketNo}
                </h3>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold text-slate-300 uppercase">
                  <Clock size={12} /> Registered: {ticketData.timestamp}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={() => setTicketData(null)} variant="outline" className="h-16 rounded-2xl font-black uppercase tracking-widest border-2">
                  <ArrowLeft size={18} className="mr-2" /> New Report
                </Button>
                <Button onClick={generatePDF} className="h-16 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest shadow-xl shadow-slate-200">
                  <Download size={18} className="mr-2" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ✅ RECENT REPORTS SECTION */}
      {recentReports.length > 0 && !ticketData && (
        <div className="w-full max-w-xl mt-8 animate-in slide-in-from-bottom-5 duration-700">
           <div className="flex items-center gap-2 mb-4 px-6">
              <Clock size={16} className="text-slate-400" />
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">My Recent Reports (This Device)</h3>
           </div>
           <div className="space-y-3">
              {recentReports.map((report:any) => (
                <div key={report.ticketNo} className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm flex justify-between items-center group hover:border-emerald-200 transition-all">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-emerald-500 uppercase italic tracking-tighter">{report.ticketNo}</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5">{report.issueType}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Logged: {report.timestamp}</span>
                   </div>
                   <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => generatePDFForRecent(report)}
                      className="h-10 w-10 md:w-auto md:px-4 rounded-xl hover:bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                   >
                     <Download size={14} />
                     <span className="hidden md:inline">PDF</span>
                   </Button>
                </div>
              ))}
           </div>
        </div>
      )}

      <footer className="mt-12 text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">App developed by Shekh Aslam, RMS X DN Jhansi</footer>
    </div>
  );
}
