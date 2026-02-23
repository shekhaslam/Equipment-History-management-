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

export const EquipmentQR = ({ equipment }: QRProps) => {
  const qrValue = `EQ-${equipment.officeUniqueKey}-${equipment.id}`;

  return (
    <div className="w-full max-w-[250px] p-4 bg-white border-2 border-[#D41217] flex flex-col items-center rounded-xl shadow-sm overflow-hidden text-left">
      
      {/* 1. Header Section */}
      <div className="flex items-center gap-2 mb-3 border-b-2 border-red-50 pb-2 w-full justify-center">
        <div className="w-7 h-7 bg-[#D41217] flex items-center justify-center text-[10px] text-white font-black rounded-full shadow-inner">
          DoP
        </div>
        <span className="text-[15px] font-black uppercase tracking-widest text-[#D41217]">
          India Post
        </span>
      </div>

      {/* 2. ✅ New Layout: Office & Div (One Line) + Large Branch Name */}
      <div className="text-center mb-3 w-full px-1">
        {/* SRO AGRA & Division in one line */}
        <p className="text-[12px] font-bold text-slate-600 uppercase leading-tight tracking-tight">
          {equipment.officeName} | {equipment.division}
        </p>
        
        {/* Branch Name: Thoda bada aur Bold */}
        <p className="text-[13px] font-black text-slate-900 uppercase leading-tight mt-1.5 border-t border-slate-100 pt-1">
          {equipment.installedAt || "BRANCH NAME"}
        </p>
      </div>

      {/* 3. QR Code Section */}
      <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg shadow-inner mb-3">
        <QRCodeSVG 
          value={qrValue} 
          size={140} 
          level={"H"} 
          includeMargin={false}
          imageSettings={{
            src: "/assets/india-post-logo.png",
            x: undefined,
            y: undefined,
            height: 24,
            width: 24,
            excavate: true,
          }}
        />
      </div>

      {/* 4. Equipment Details Footer */}
      <div className="w-full text-center bg-[#D41217]/5 py-2 rounded-lg border border-[#D41217]/10">
        <p className="text-[14px] font-black uppercase text-slate-900 truncate px-1">
          {equipment.equipmentName}
        </p>
        <p className="text-[15px] font-bold text-[#D41217] mt-1 border-t border-dashed border-[#D41217]/20 pt-1 tracking-tighter">
          S/N: {equipment.serialNumber}
        </p>
      </div>
    </div>
  );
};