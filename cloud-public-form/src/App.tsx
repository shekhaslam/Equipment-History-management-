import { useState, useEffect } from 'react';
import { 
  Loader2, Download, ArrowLeft, ShieldAlert, BadgeCheck, Clock, 
  Settings, AlertCircle, Cpu, Wifi, Printer, MoreHorizontal, 
  History, Search, MapPin, User, Calendar
} from "lucide-react";
import { QRCodeCanvas } from 'qrcode.react';
import './App.css';

// --- CONFIGURATION ---
const GAS_URL = "https://script.google.com/macros/s/AKfycbztBBsjjK3SaeME8ZUBdW-MXNoDK79fxHLr3v21Xn5hIc4YDeKPazevb-iMqsuWmpYA/exec"; 

function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const equipmentId = queryParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [equipment, setEquipment] = useState<any>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tracking Mode
  const [trackingId, setTrackingId] = useState(queryParams.get("track") || "");
  const [isTracking, setIsTracking] = useState(!!queryParams.get("track"));
  const [trackResult, setTrackResult] = useState<any>(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  
  const [selectedAssetType, setSelectedAssetType] = useState("");
  const [formData, setFormData] = useState({
    ticketNo: "",
    reporterName: "",
    branchName: "",
    mobile: "",
    issueType: "",
    issueDescription: ""
  });

  const faultCategories: Record<string, { options: string[], icon: any }> = {
    "Printer": {
      options: [
        "Paper Jam",
        "Frequent Paper Jam",
        "Light Print / Faded Print",
        "Toner Low / Empty",
        "Cartridge Not Detected",
        "Lines on Print",
        "Blank Page Printing",
        "Slow Printing",
        "Not Printing",
        "Printer Offline",
        "Spooler Error",
        "Driver Issue",
        "USB / LAN Not Detecting",
        "Overheating",
        "Strange Noise",
        "Cover Open Error",
        "Memory Full Error",
        "Firmware Error"
      ],
      icon: Printer
    },
    "CPU/Desktop": {
      options: [
        "System Not Starting",
        "No Power",
        "Auto Restart",
        "System Hanging / Slow",
        "Blue Screen Error (BSOD)",
        "Operating System Corrupted",
        "Windows Not Loading",
        "Login Issue",
        "Virus / Malware Issue",
        "Software Not Opening",
        "Application Crash",
        "USB Ports Not Working",
        "Keyboard / Mouse Not Working",
        "Display Not Coming",
        "Beep Sound Error",
        "Hard Disk Failure",
        "RAM Issue",
        "Overheating",
        "Fan Not Working",
        "LAN Not Working",
        "No Internet"
      ],
      icon: Cpu
    },
    "Thermal Printer": {
      options: [
        "Paper Not Feeding",
        "Paper Jam",
        "Cutter Jam",
        "Receipt Not Printing",
        "Light Print",
        "Blank Print",
        "Red Light Error",
        "Head Overheat",
        "Printing Skipped Lines",
        "USB Not Detecting",
        "LAN Not Working",
        "Driver Issue",
        "Power Issue",
        "Auto Cut Not Working"
      ],
      icon: Printer
    },
    "UPS/Power": {
      options: [
        "UPS Not Powering On",
        "No Backup",
        "Battery Not Charging",
        "Battery Backup Low",
        "Continuous Beeping",
        "Overload Error",
        "Output Not Coming",
        "Fuse Blown",
        "Burning Smell",
        "Power Fluctuation",
        "Frequent Power Trip"
      ],
      icon: Wifi
    },
    "Network/Internet": {
      options: [
        "No Internet",
        "Slow Internet",
        "LAN Cable Issue",
        "Switch Port Not Working",
        "Router Not Working",
        "IP Conflict",
        "DNS Issue",
        "Frequent Disconnection",
        "WiFi Not Working",
        "Limited Connectivity",
        "VPN Not Connecting",
        "Server Not Reachable"
      ],
      icon: Wifi
    },
    "Scanner": {
      options: [
        "Scanner Not Working",
        "Not Detecting",
        "Driver Issue",
        "Slow Scanning",
        "Image Distorted",
        "Lines in Scan",
        "ADF Not Working",
        "Paper Jam in Scanner",
        "Power Issue"
      ],
      icon: Cpu
    },
    "Monitor": {
      options: [
        "No Display",
        "Flickering Screen",
        "Dim Display",
        "Lines on Screen",
        "Color Issue",
        "Monitor Not Powering On",
        "Cable Issue",
        "Resolution Issue"
      ],
      icon: Cpu
    },
    "Software/Application": {
      options: [
        "Software Not Opening",
        "Application Crash",
        "Login Failure",
        "Data Not Saving",
        "Sync Issue",
        "Update Failure",
        "Permission Denied",
        "Error Message Showing",
        "APT Not Working",
        "SAP / ERP Issue"
      ],
      icon: Cpu
    },
    "Peripheral Devices": {
      options: [
        "Keyboard Not Working",
        "Mouse Not Working",
        "Barcode Scanner Not Working",
        "Biometric Device Not Working",
        "Device Not Detecting",
        "Driver Issue",
        "Cable Fault"
      ],
      icon: Cpu
    },
    "Other": {
      options: [
        "General Fault",
        "Physical Damage",
        "Water Damage",
        "Unknown Issue",
        "Multiple Devices Issue"
      ],
      icon: MoreHorizontal
    }
  };

  useEffect(() => {
    if (GAS_URL.includes("/library/")) {
        setError(`CRITICAL ERROR: Your GAS_URL is a 'Library' URL. You MUST deploy your script as a 'Web App' to get the URL ending in /exec.`);
        setIsLoading(false);
        return;
    }

    if (!equipmentId && !isTracking) {
      setError("Please scan a valid machine QR code or provide a tracking ID.");
      setIsLoading(false);
      return;
    }

    if (equipmentId) {
        console.log("Fetching equipment metadata for ID:", equipmentId);
        fetch(`${GAS_URL}?action=get_equipment&id=${equipmentId}`)
        .then(async res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            return JSON.parse(text);
        })
        .then(data => {
            if (data.success) {
            // Correctly use data.data from Google Script response
            const equip = data.data;
            setEquipment(equip);
            // Strong fallback for categorization (Category OR Name)
            const cat = equip.category || equip.name || "Appliance";
            setSelectedAssetType(cat);
            setError(null);
            }
        })
        .catch(err => {
            console.error("❌ Cloud Connection Error:", err.message);
            setError(`Cloud Connection Failed: ${err.message}`);
        })
        .finally(() => setIsLoading(false));
    } else {
        setIsLoading(false);
    }
  }, [equipmentId, isTracking]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId) return;
    
    if (!formData.reporterName || !formData.branchName || !formData.issueType || !formData.issueDescription) {
        alert("Please fill in all required fields.");
        return;
    }

    setIsSubmitting(true);
    try {
      // Combine category and issue type before sending for maximum visibility in sheets
      const issueWithCategory = selectedAssetType && !formData.issueType.includes(selectedAssetType)
        ? `${selectedAssetType}: ${formData.issueType}`
        : formData.issueType;

      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          issueType: issueWithCategory,
          action: "submit_report",
          equipmentId: Number(equipmentId),
          faultDomain: selectedAssetType
        })
      });

      const resData = await fetch(`${GAS_URL}?action=get_latest_ticket&equipmentId=${equipmentId}&reporter=${encodeURIComponent(formData.reporterName)}`)
        .then(r => r.json());

      if (resData.success) {
        const enrichedData = {
          ...formData,
          ticketNo: resData.ticketNo,
          timestamp: new Date().toLocaleString('en-IN', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true
          }),
          equipmentName: equipment?.name || "DOP Asset",
          serialNumber: equipment?.sn || "S/N Pending",
          model: equipment?.model || "---",
          officeName: equipment?.office || "---",
          division: equipment?.division || "---"
        };
        
        setTicketData(enrichedData);

        // ✅ SAVE TO LOCAL STORAGE (Recent Reports)
        try {
          const recent = JSON.parse(localStorage.getItem("dop_cloud_recent") || "[]");
          const updated = [enrichedData, ...recent.filter((t:any) => t.ticketNo !== enrichedData.ticketNo)].slice(0, 5);
          localStorage.setItem("dop_cloud_recent", JSON.stringify(updated));
        } catch (e) {}

        // ✅ AUTO DOWNLOAD PDF (SIMULATED PRINT)
        setTimeout(() => {
          window.print();
        }, 1500);
      } else {
          throw new Error("Could not retrieve Ticket ID");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      // Offline fallback
      setTicketData({ 
        ...formData, 
        ticketNo: "OFF-" + Math.floor(Math.random()*9000+1000),
        timestamp: new Date().toLocaleString(),
        equipmentName: equipment?.name || "DOP Asset",
        serialNumber: equipment?.sn || "S/N Pending",
        model: equipment?.model || "---",
        officeName: equipment?.office || "---",
        division: equipment?.division || "---",
        area: equipment?.area || "---",
        pincode: equipment?.pincode || "---"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingId) return;
    
    setIsTrackLoading(true);
    try {
      const res = await fetch(`${GAS_URL}?action=get_status&ticket=${trackingId}`);
      const data = await res.json();
      setTrackResult(data);
    } catch (e) {
      alert("Tracking service unavailable. Please try again later.");
    } finally {
      setIsTrackLoading(false);
    }
  };

  const generatePDFForData = async () => {
    // Native print is perfectly styled with colors and A4 dimensions via CSS
    window.print();
  };

  if (isLoading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-20 h-20 border-[6px] border-red-50 rounded-full animate-ping"></div>
        <Loader2 className="h-10 w-10 animate-spin text-[#D41217] relative z-10" />
      </div>
      <p className="font-bold text-slate-400 uppercase tracking-widest text-[11px] animate-pulse">Official Portal Loading...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
       <div className="max-w-md w-full bg-white p-12 rounded-3xl shadow-xl text-center border border-slate-200">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="text-red-600" size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Access Restricted</h2>
          <p className="text-slate-500 font-medium mt-4 text-sm leading-relaxed">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest">Retry Connection</button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center font-sans print:bg-white print:min-h-0">
      
      {/* SARKARI A4 PRINT RECEIPT - ONLY VISIBLE ON SYSTEM PRINT */}
      {ticketData && (
        <div 
          className="hidden print:block w-[210mm] min-h-[297mm] bg-white text-black p-8 text-sm font-serif setup-print mx-auto"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <div className="flex items-center justify-between mb-6 border-b-4 border-[#D41217] pb-6">
            <div className="w-20">
              <img src="/assets/india-post-logo.png" className="w-full object-contain grayscale-0" alt="India Post" />
            </div>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-black uppercase tracking-widest text-[#D41217]">Department of Posts</h1>
              <h2 className="text-lg font-bold uppercase tracking-widest mt-1 text-black">Government of India</h2>
              <p className="text-xs font-bold mt-3 bg-black text-white inline-block px-4 py-1.5 tracking-[0.2em] uppercase">Maintenance / Fault Registration Slip</p>
            </div>
            <div className="w-20 border-2 border-dashed border-gray-300 h-24 flex items-center justify-center p-1 relative">
               <span className="text-[8px] text-gray-400 text-center uppercase font-bold leading-tight">Affix<br/>Official<br/>Seal</span>
            </div>
          </div>
          
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="font-bold">Ticket ID: <span className="text-xl border border-black px-3 py-1 bg-gray-100">{ticketData.ticketNo}</span></p>
            </div>
            <div className="text-right text-xs">
              <p><strong>Generated On:</strong> {ticketData.timestamp}</p>
              <p><strong>Status:</strong> ACKNOWLEDGED (PENDING RESOLUTION)</p>
            </div>
          </div>

          <table className="w-full border-collapse border-2 border-black mb-6">
            <tbody>
              <tr>
                <th className="border border-black p-2 bg-gray-100 text-left w-1/4">Asset Name</th>
                <td className="border border-black p-2 w-1/4 font-semibold">{ticketData.equipmentName}</td>
                <th className="border border-black p-2 bg-gray-100 text-left w-1/4">Serial No (S/N)</th>
                <td className="border border-black p-2 w-1/4 font-mono font-bold">{ticketData.serialNumber}</td>
              </tr>
              <tr>
                <th className="border border-black p-2 bg-gray-100 text-left">Asset Model</th>
                <td className="border border-black p-2">{ticketData.model}</td>
                <th className="border border-black p-2 bg-gray-100 text-left">Office Locaton</th>
                <td className="border border-black p-2 font-semibold">{ticketData.officeName}</td>
              </tr>
              <tr>
                <th className="border border-black p-2 bg-gray-100 text-left">Division / Area</th>
                <td className="border border-black p-2">{ticketData.division} ({ticketData.area})</td>
                <th className="border border-black p-2 bg-gray-100 text-left">Pincode</th>
                <td className="border border-black p-2">{ticketData.pincode}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse border-2 border-black mb-6">
            <tbody>
              <tr>
                <th className="border border-black p-2 bg-gray-100 text-left w-1/4">Reporting Officer</th>
                <td className="border border-black p-2 w-1/4 font-bold">{ticketData.reporterName}</td>
                <th className="border border-black p-2 bg-gray-100 text-left w-1/4">Section/Branch</th>
                <td className="border border-black p-2 w-1/4">{ticketData.branchName}</td>
              </tr>
              <tr>
                <th className="border border-black p-2 bg-gray-100 text-left w-1/4">Contact Number</th>
                <td className="border border-black p-2 w-1/4">{ticketData.mobile || 'NOT PROVIDED'}</td>
                <th className="border border-black p-2 bg-gray-100 text-left w-1/4">Fault Category</th>
                <td className="border border-black p-2 w-1/4 uppercase font-bold">{ticketData.issueType}</td>
              </tr>
              <tr>
                <th colSpan={4} className="border border-black p-2 bg-gray-100 text-left">Detailed Fault Description / Remarks</th>
              </tr>
              <tr>
                <td colSpan={4} className="border border-black p-3 h-20 align-top italic">
                  {ticketData.issueDescription}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-12 pt-12 border-t border-black">
            <div className="text-center">
              <QRCodeCanvas value={`${window.location.origin}/?track=${ticketData.ticketNo}`} size={80} level="M" />
              <p className="text-[10px] mt-1">Scan to Track Status</p>
            </div>
            <div className="text-right">
              <p className="mb-8">_______________________________</p>
              <p className="font-bold text-sm">Authorized Signatory / In-Charge</p>
              <p className="text-xs">Digital Verification System</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-[#D41217] h-1.5 fixed top-0 left-0 z-50 shadow-sm print:hidden"></div>

      <div className="w-full max-w-3xl bg-white min-h-screen md:min-h-0 md:my-10 md:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col print:hidden">
        
        {/* Official Header */}
        <div className="px-8 py-10 md:px-12 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white print:hidden">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white p-2 border-2 border-[#D41217]/10 rounded-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer" onClick={() => window.location.href = '/'}>
                <img src="/assets/india-post-logo.png" alt="India Post" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-[#D41217] text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">India Post</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">Global Maintenance Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsTracking(!isTracking)}
                className={`p-3 rounded-xl transition-all ${isTracking ? 'bg-[#D41217] text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                title="Track Ticket"
            >
                <Search size={20} />
            </button>
            <div className="hidden md:block text-right border-l border-slate-100 pl-6">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-1">Status</p>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Bridge</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-10 md:px-12 flex-1 print:p-0">
          {isTracking ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                    <History className="mx-auto text-slate-300 mb-4" size={48} />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Request Tracking</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Check the real-time status of your ticket</p>
                </div>

                <div className="max-w-md mx-auto">
                    <form onSubmit={handleTrackSubmit} className="relative mb-8">
                        <input 
                            type="text" 
                            placeholder="Enter Ticket ID (e.g. DOP_ER-XXXX)" 
                            className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:border-[#D41217] outline-none transition-all pr-16 uppercase"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={isTrackLoading}
                            className="absolute right-2 top-2 bottom-2 aspect-square bg-[#D41217] text-white rounded-xl flex items-center justify-center hover:bg-[#b50f14] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isTrackLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                        </button>
                    </form>

                    {trackResult && (
                        <div className="animate-in zoom-in-95 duration-500 bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-xl">
                            <div className={`p-6 text-center ${trackResult.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-[#D41217]'} text-white`}>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Current Status</p>
                                <h3 className="text-2xl font-black uppercase tracking-widest">{trackResult.status || 'PENDING'}</h3>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400"><BadgeCheck size={18} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Identified</p>
                                        <p className="text-sm font-bold text-slate-900">{trackResult.equipmentName || 'Asset Unlinked'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400"><Clock size={18} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Update</p>
                                        <p className="text-sm font-bold text-slate-900">{trackResult.lastUpdate || 'Awaiting Sync'}</p>
                                    </div>
                                </div>
                                {trackResult.status === 'RESOLVED' && (
                                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Completion Note</p>
                                        <p className="text-xs font-bold text-emerald-800 leading-relaxed italic">"The reported fault has been rectified and equipment is verified for duty."</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          ) : ticketData ? (
            <div className="animate-in zoom-in-95 duration-700">
              
              <div className="text-center mb-8 print:hidden">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <BadgeCheck size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Request Success</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Digital Receipt Generated & Acknowledged</p>
              </div>

              {/* LIVE VIEW RECEIPT CARD (PREVIEW) */}
              <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden mb-10 relative">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <img src="/assets/india-post-logo.png" className="w-8 object-contain mix-blend-screen" alt="" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">India Post</p>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Maintenance Receipt</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ticket ID</p>
                        <p className="text-lg font-black text-amber-400 font-mono tracking-tighter">{ticketData.ticketNo}</p>
                    </div>
                </div>

                <div className="p-8 md:p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-400"><Cpu size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Asset Details</span></div>
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <p className="text-sm font-black text-slate-900 mb-1">{ticketData.equipmentName}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">S/N: {ticketData.serialNumber}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Model: {ticketData.model}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <div className="flex items-center gap-3 text-slate-400"><MapPin size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Location</span></div>
                             <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 min-h-[100px]">
                                <p className="text-sm font-black text-slate-900 mb-1">{ticketData.officeName}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">PIN: {ticketData.pincode}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Division: {ticketData.division}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-8">
                        <div className="flex items-center gap-3 text-slate-400 mb-4"><User size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Reporter Identification</span></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Officer</p><p className="text-[13px] font-black text-slate-900">{ticketData.reporterName}</p></div>
                            <div><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Unit</p><p className="text-[13px] font-black text-slate-900">{ticketData.branchName}</p></div>
                            <div><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Contact</p><p className="text-[13px] font-black text-slate-900">{ticketData.mobile || '---'}</p></div>
                            <div><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Reported At</p><p className="text-[13px] font-black text-slate-900">{ticketData.timestamp}</p></div>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert size={80} /></div>
                        <div className="relative z-10">
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-[0.3em] mb-4">FAULT DESCRIPTION</p>
                            <p className="text-lg font-black leading-tight mb-2">[{ticketData.issueType}]</p>
                            <p className="text-sm text-slate-300 font-medium italic border-l-4 border-amber-400 pl-4 py-2 mt-4 leading-relaxed">
                                "{ticketData.issueDescription}"
                            </p>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Track status anytime</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Scan the QR code to track your <br /> complaint status in real-time.</p>
                        </div>
                        <div className="p-3 bg-white border-2 border-slate-50 rounded-2xl shadow-inner">
                            <QRCodeCanvas 
                                value={`${window.location.origin}/?track=${ticketData.ticketNo}`} 
                                size={100}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 py-6 text-center border-t border-slate-100">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Digital Verification System | Department of Posts</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                <button 
                  type="button"
                  onClick={generatePDFForData} 
                  className="h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-black active:scale-95 transition-all"
                >
                  <Download size={18} className="text-amber-400" /> Save Report as PDF
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, ticketNo: ticketData.ticketNo }));
                    setTicketData(null);
                    setIsTracking(false);
                    window.scrollTo(0, 0);
                  }} 
                  className="h-16 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 z-50 relative"
                >
                  <ArrowLeft size={16} /> Modified / Go Back
                </button>
              </div>

            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* ✅ RECENT REPORTS SECTION (MOBILE RETRIEVAL) */}
              {(() => {
                const recent = JSON.parse(localStorage.getItem("dop_cloud_recent") || "[]");
                if (recent.length > 0) {
                  return (
                    <div className="mb-10 px-2 animate-in slide-in-from-top-4 duration-500">
                       <div className="flex items-center gap-2 mb-4 opacity-40">
                          <Clock size={14} className="text-slate-900" />
                          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">My Recent Reports</h4>
                       </div>
                       <div className="space-y-3">
                          {recent.map((r:any) => (
                            <div key={r.ticketNo} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm active:scale-[0.98] transition-all" 
                                 onClick={() => { setTicketData(r); window.scrollTo(0, 0); }}>
                               <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-[9px] font-black text-red-600 uppercase italic leading-none">{r.ticketNo}</p>
                                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">{r.issueType}</p>
                                  <p className="text-[8px] font-bold text-slate-400 mt-0.5">{r.timestamp}</p>
                               </div>
                               <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                                  <Download size={16} />
                               </button>
                            </div>
                          ))}
                       </div>
                       <div className="h-px bg-slate-100 my-10"></div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-6 bg-[#D41217] rounded-full"></div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Asset Metadata</h3>
                </div>

                {equipment ? (
                  <div className="bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      {[
                        { label: "Asset Name", value: equipment.name, icon: Cpu },
                        { label: "Serial Number", value: equipment.sn, icon: BadgeCheck },
                        { label: "Office/Unit", value: equipment.office, icon: MapPin },
                        { label: "Division", value: equipment.division, icon: Settings },
                        { label: "Service Model", value: equipment.model, icon: Settings },
                        { label: "Region/Area", value: equipment.area, icon: Wifi },
                      ].map((item, idx) => (
                        <div key={idx} className={`p-6 flex items-start gap-4 ${idx % 2 === 0 ? 'bg-white' : ''} border-b border-slate-100 last:border-0`}>
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                             <item.icon size={18} className="text-slate-400" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                             <p className="text-[14px] font-black text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">{item.value || "Not Found"}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 flex items-center gap-6 shadow-sm">
                    <ShieldAlert className="text-amber-500 shrink-0" size={32} />
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm">Offline Verification</h4>
                      <p className="text-amber-700/80 text-xs font-medium mt-1 leading-relaxed">Scanned machine ID is pending synchronization. Your report will be linked upon next server handshake.</p>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-12">
                
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#D41217] rounded-full"></div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Reporter & Time</h3>
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Calendar size={12} /> Registration Date</label>
                            <div className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-400 flex items-center select-none overflow-hidden text-sm">
                                {new Date().toLocaleDateString('en-GB')}
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Officer Name</label>
                            <input 
                                placeholder="e.g. Rahul Kumar" required 
                                className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl px-5 font-bold text-slate-900 focus:border-[#D41217] transition-all outline-none" 
                                value={formData.reporterName} 
                                onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })} 
                            />
                        </div>
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Branch/Section</label>
                            <input 
                                placeholder="e.g. Accounts / Dispatch" required 
                                className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl px-5 font-bold text-slate-900 focus:border-[#D41217] transition-all outline-none" 
                                value={formData.branchName} 
                                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Official Mobile</label>
                            <input 
                                placeholder="Primary Contact Number" maxLength={10} required
                                className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl px-5 font-bold text-slate-900 focus:border-[#D41217] transition-all outline-none" 
                                value={formData.mobile} 
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-[#D41217] rounded-full"></div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Maintenance Needs</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Fault Domain</label>
                      <div className="relative">
                        <select
                          onChange={(e) => setSelectedAssetType(e.target.value)}
                          required
                          className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl px-5 font-black text-slate-900 focus:border-[#D41217] transition-all outline-none appearance-none cursor-pointer"
                        >
                          <option value="">Select Domain...</option>
                          {Object.keys(faultCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                           <MoreHorizontal size={18} />
                        </div>
                      </div>
                    </div>

                    {selectedAssetType && (
                      <div className="space-y-2 animate-in slide-in-from-right-4 duration-300">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Specific Problem</label>
                        <div className="relative">
                          <select
                            name="issueType" required
                            className="w-full h-14 bg-white border-2 border-[#D41217]/10 rounded-2xl px-5 font-black text-[#D41217] focus:border-[#D41217] transition-all outline-none appearance-none cursor-pointer"
                            value={formData.issueType}
                            onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                          >
                            <option value="">Choose Problem...</option>
                            {faultCategories[selectedAssetType].options.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#D41217]">
                             <AlertCircle size={18} />
                          </div>
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Fault Summary</label>
                    <textarea 
                      placeholder="e.g. Not working since morning, making noise, smelled smoke etc." required
                      className="w-full min-h-[120px] bg-white border-2 border-slate-100 rounded-2xl p-5 font-bold text-slate-800 focus:border-[#D41217] transition-all outline-none resize-none" 
                      value={formData.issueDescription} 
                      onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="pb-10 flex flex-col items-center">
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-16 bg-[#D41217] text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-red-200 hover:bg-[#b50f14] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Transmitting Data...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Maintenance Report</span>
                        <BadgeCheck size={20} />
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-8 text-center leading-relaxed">
                    Digital Authentication Protocol GoI-DOP-V2 <br />
                    24/7 Service Monitoring Active
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-12 text-center border-t border-slate-100 mt-auto print:hidden">
            <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-4 grayscale opacity-40">
                    <img src="/assets/india-post-logo.png" className="h-6" alt="" />
                    <div className="w-px h-4 bg-slate-300"></div>
                    <img src="/assets/digital-india.png" className="h-6" alt="" />
                </div>
               <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Department of Posts | GoI</p>
                  <p className="text-slate-300 text-[9px] font-bold uppercase tracking-[0.2em] mt-3">App by Shekh Aslam, RMS 'X' DN, Jhansi</p>
               </div>
            </div>
        </div>
      </div>
      
      <div className="py-12 px-6 flex flex-col items-center gap-6 text-slate-300 print:hidden">
         <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
            <span className="text-[9px] font-black uppercase tracking-widest hover:text-slate-400 cursor-pointer transition-colors">Security</span>
            <span className="text-[9px] font-black uppercase tracking-widest hover:text-slate-400 cursor-pointer transition-colors">Portal Integrity</span>
            <span className="text-[9px] font-black uppercase tracking-widest hover:text-slate-400 cursor-pointer transition-colors">System Build 2026.03.18.v2</span>
         </div>
      </div>
    </div>
  );
}

export default App;
