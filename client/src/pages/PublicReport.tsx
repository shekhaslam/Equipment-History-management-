import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
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

  // 1. Machine ki details fetch karna (Bina login ke)
  const { data: equipment, isLoading } = useQuery<any>({
    queryKey: [`/api/public/equipment/${equipmentId}`],
    enabled: !!equipmentId
  });

  const faultCategories: Record<string, string[]> = {
    "Printer": ["Paper Jam (कागज फंसना)", "Light Print (धुंधला प्रिंट)", "Toner Low (स्याही कम)", "Not Powering On"],
    "CPU/Desktop": ["System Hanging (सिस्टम अटकना)", "Blue Screen Error", "Not Starting"],
    "Thermal Printer": ["Cutter Jam (कटर फंसना)", "Receipt Not Printing", "Red Light Error"],
    "UPS/Network": ["No Backup", "No Internet", "Power Trip"],
    "Other": ["General Fault", "Physical Damage"]
  };

  // 2. Database mein report save karne ka logic (The Bridge)
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/public/report", {
        equipmentId: Number(equipmentId),
        reporterName: data.reporterName,
        reporterMobile: data.mobile,
        // Branch aur Issue ko mila kar description banana
        issueDescription: `Branch: ${data.branchName} | Fault: ${data.issueType} | Details: ${data.issueDescription}`,
        priority: "medium"
      });
      return res.json();
    },
    onSuccess: (serverData) => {
      setTicketData({
        ...formData,
        ticketNo: serverData.ticketNo, // Asli Unique Ticket No (DOP-2026-XXXX)
        timestamp: new Date().toLocaleString('en-IN')
      });
      toast({ title: "TICKET LOGGED", description: `Official Ref: ${serverData.ticketNo}` });
    },
    onError: (error: any) => {
      toast({ 
        title: "Submission Error", 
        description: error.message || "Server se connection nahi ho paya",
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

  const generateCleanPDF = () => {
    const pdfContent = `
      <div style="padding: 40px; font-family: sans-serif; color: #333;">
        <div style="display: flex; align-items: center; border-bottom: 3px solid #D41217; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="flex: 1;">
            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">Department of Posts</h1>
            <p style="margin: 5px 0 0; font-size: 12px; color: #666; font-weight: bold; letter-spacing: 2px;">MAINTENANCE AUDIT RECEIPT</p>
          </div>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 30px;">
          <div style="flex: 1; padding: 15px; background: #f9f9f9; border-radius: 10px;">
            <p style="font-size: 10px; color: #999; margin: 0;">INSTALLED AT</p>
            <p style="font-weight: bold; margin: 5px 0;">${equipment.installedAt}</p>
            <p style="font-size: 11px; margin: 0;">${equipment.officeName} | Status: ${equipment.status || 'ACTIVE'}</p>
          </div>
          <div style="flex: 1; padding: 15px; background: #f9f9f9; border-radius: 10px;">
            <p style="font-size: 10px; color: #999; margin: 0;">EQUIPMENT DETAIL</p>
            <p style="font-weight: bold; margin: 5px 0;">${equipment.equipmentName}</p>
            <p style="font-size: 11px; margin: 0;">S/N: ${equipment.serialNumber} | Model: ${equipment.modelNumber}</p>
          </div>
        </div>

        <div style="text-align: center; border: 2px solid #000; padding: 30px; border-radius: 20px; margin-bottom: 30px;">
          <p style="font-size: 12px; letter-spacing: 4px; color: #666; margin: 0;">OFFICIAL TRACKING ID</p>
          <h2 style="font-size: 40px; color: #D41217; margin: 10px 0;">${ticketData.ticketNo}</h2>
          <p style="font-size: 11px; color: #999; font-style: italic;">Verified on: ${ticketData.timestamp}</p>
        </div>

        <div style="padding: 20px; border: 1px solid #eee; border-radius: 15px;">
          <h3 style="font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 10px;">AUDIT LOG DETAILS:</h3>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr style="height: 35px;"><td><strong>Reporter:</strong></td><td align="right">${ticketData.reporterName} (${ticketData.branchName})</td></tr>
            <tr style="height: 35px;"><td><strong>Contact:</strong></td><td align="right">${ticketData.mobile}</td></tr>
            <tr style="height: 35px;"><td><strong>Fault Type:</strong></td><td align="right" style="color: #D41217;">${ticketData.issueType}</td></tr>
          </table>
        </div>
        
        <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #aaa;">
          This is an official computer-generated document. No signature required.
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Audit_${ticketData.ticketNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(pdfContent).set(opt).save();
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-red-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-[2.5rem] overflow-hidden border-t-[12px] border-red-600">
        <div className="p-8">
          <div className="flex items-center gap-4 border-b pb-6 mb-6">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">DOP</div>
            <div>
              <h1 className="text-xl font-black uppercase">Department of Posts</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest">MAINTENANCE AUDIT</p>
            </div>
          </div>

          {!ticketData ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input name="reporterName" placeholder="Officer Name" required value={formData.reporterName} onChange={(e)=>setFormData({...formData, reporterName: e.target.value})} />
                <Input name="branchName" placeholder="Branch Name" required value={formData.branchName} onChange={(e)=>setFormData({...formData, branchName: e.target.value})} />
              </div>
              <Input name="mobile" placeholder="Mobile No" maxLength={10} required value={formData.mobile} onChange={(e)=>setFormData({...formData, mobile: e.target.value})} />
              <select onChange={(e) => setSelectedAssetType(e.target.value)} required className="w-full h-10 rounded-md border px-3 text-sm bg-slate-50">
                <option value="">Select Asset Category...</option>
                {Object.keys(faultCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select name="issueType" required className="w-full h-10 rounded-md border px-3 text-sm bg-slate-50" value={formData.issueType} onChange={(e)=>setFormData({...formData, issueType: e.target.value})}>
                <option value="">Select Fault...</option>
                {selectedAssetType && faultCategories[selectedAssetType].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <Textarea name="issueDescription" placeholder="Additional Details (if any)..." required value={formData.issueDescription} onChange={(e)=>setFormData({...formData, issueDescription: e.target.value})} />
              <Button type="submit" disabled={mutation.isPending} className="w-full bg-red-600 h-12 font-bold uppercase">
                {mutation.isPending ? <Loader2 className="animate-spin" /> : "Submit Official Report"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="border-4 border-slate-900 p-8 rounded-[2rem]">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Official Tracking ID</p>
                <h2 className="text-4xl font-black text-red-600">{ticketData.ticketNo}</h2>
                <p className="text-[10px] text-slate-500 mt-2 italic">Report Registered in Server</p>
              </div>
              
              <div className="flex gap-4">
                <Button onClick={() => setTicketData(null)} variant="outline" className="flex-1 h-14 font-bold gap-2">
                  <ArrowLeft size={18}/> BACK
                </Button>
                <Button onClick={generateCleanPDF} className="flex-[2] h-14 bg-slate-900 text-white font-bold gap-2">
                  <Download size={18}/> DOWNLOAD RECEIPT
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}