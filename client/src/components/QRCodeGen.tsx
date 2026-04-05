import { QRCodeSVG } from 'qrcode.react';

interface QRProps {
  equipment: {
    id: number;
    equipmentName: string;
    serialNumber: string;
    officeName: string;
    officeUniqueKey: string;
    division: string;
    installedAt: string;
  };
}

import { useEffect, useState } from 'react';

export const EquipmentQR = ({ equipment }: QRProps) => {
  const [serverIP, setServerIP] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/server-info')
      .then(res => res.json())
      .then(data => setServerIP(data.ip))
      .catch(() => setServerIP(null));
  }, []);

  // ✅ Scan link pointing to the PERMANENT GLOBAL PUBLIC FORM (Vercel)
  const baseUrl = "https://project-pt0db.vercel.app";
    
  const qrValue = `${baseUrl}?id=${equipment.id}`;

  return (
    <div className="w-[110mm] h-[72mm] p-6 bg-white border-[2.5px] border-black flex flex-col items-center rounded-none shadow-none overflow-hidden text-left relative print:m-0 print:border-black print:shadow-none">

      {/* 1. Header Section: Official Header Bar */}
      <div className="flex items-center gap-4 mb-2.5 border-b-[2.5px] border-slate-900 pb-2 w-full justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="shrink-0 bg-white">
             <img src="/assets/india-post-logo.png" alt="Logo" className="w-14 h-11 object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-black text-slate-900 leading-tight uppercase tracking-tight">India Post</h1>
            <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest leading-none">Dept. of Posts, Govt. of India</p>
            <p className="text-[15px] font-black text-red-600 uppercase mt-0.5 tracking-tighter">Equipment Repair Request</p>
          </div>
        </div>
        
        <div className="text-right flex flex-col justify-center max-w-[45%]">
          <p className="text-[12px] font-black text-slate-900 uppercase leading-none mb-0.5 truncate">
            {equipment.officeName}
          </p>
          <p className="text-[10px] font-bold text-slate-600 uppercase leading-none truncate">
            {equipment.division}
          </p>
        </div>
      </div>

      <div className="flex w-full gap-5 items-start h-full overflow-hidden">
        {/* 2. QR Code Section (Left) */}
        <div className="p-1.5 bg-white border-2 border-slate-200 rounded-xl shadow-sm shrink-0">
          <QRCodeSVG
            value={qrValue}
            size={125}
            level={"H"}
            includeMargin={true}
            imageSettings={{
              src: "/assets/india-post-logo.png",
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>

        {/* 3. Details Section (Right) */}
        <div className="flex-1 flex flex-col justify-between py-0.5 h-full min-w-0">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Asset Name</p>
            <p className="text-[17px] font-black text-slate-900 uppercase leading-tight line-clamp-2 break-words">
              {equipment.equipmentName}
            </p>
          </div>

          <div className="mt-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Serial Number</p>
            <p className="text-[20px] font-black text-[#D41217] leading-none tracking-tight font-mono truncate">
              {equipment.serialNumber}
            </p>
          </div>

          <div className="mt-3 border-t-2 border-dashed border-slate-300 pt-2.5">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-0.5">Installed At</p>
            <p className="text-[14px] font-black text-slate-900 uppercase leading-none truncate">
              {equipment.installedAt || "MAIN OFFICE"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Footer Branding & URL Debug */}
      <div className="absolute bottom-1.5 left-5 right-5 flex justify-between items-center opacity-40">
        <p className="text-[7px] font-bold text-slate-900 uppercase">
          E-History System | Managed by DOP
        </p>
        <p className="text-[7px] font-mono text-slate-400 truncate max-w-[50%]">
          {baseUrl}
        </p>
      </div>
    </div>
  );
};
