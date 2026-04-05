import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateProPDF = (equipment: any, isPreview: boolean = false) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const totalCost = equipment.repairs?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 0;
  const status = equipment.status || "ACTIVE";
  const isCondemned = status === "CONDEMNED";
  
  // 1. HEADER & LOGO
  try {
    doc.addImage("/assets/india-post-logo.png", 'PNG', 15, 10, 25, 15); 
  } catch (e) { console.error("Logo missing"); }

  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(212, 18, 23); 
  doc.text("DEPARTMENT OF POSTS", 115, 18, { align: "center" });
  doc.setFontSize(14).setTextColor(0).text("Equipment History Sheet (Official)", 115, 26, { align: "center" });

  // 2. TOP DETAILS (Branch Name Fixed to Location)
  doc.setFontSize(10);
  doc.text(`LETTER NO: ___________________________`, 15, 38);
  doc.text(`MACHINE NO: ${equipment.serialNumber || '---'}`, 130, 38);
  doc.text(`LOCATION: ${equipment.installedAt || 'MAIN OFFICE'}`, 15, 44);
  doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 130, 44);

  // Office & Division Small Header
  doc.setFontSize(8).setTextColor(100);
  doc.text(`Office: ${equipment.officeName} | Division: ${equipment.division}`, 115, 31, { align: "center" });
  doc.setTextColor(0);

  // ✅ 3. FIXED STAMP POSITION (Ab ye table se nahi takrayega)
  if (isCondemned) {
    doc.setFillColor(239, 68, 68); 
    // Iski Y position badha di gayi hai (46) taaki ye header lines ke niche rahe
    doc.roundedRect(160, 45, 35, 8, 2, 2, 'F');
    doc.setTextColor(255).setFontSize(9).text("CONDEMNED", 177.5, 50.5, { align: "center" });
    doc.setTextColor(0);
  }

  // 4. MAIN DATA GRID (startY thoda niche kiya taaki stamp clear dikhe)
  autoTable(doc, {
    startY: 55,
    body: [
      ["Office Name:", equipment.officeName, "Division:", equipment.division],
      ["City/Area:", equipment.area, "Pincode:", equipment.pincode],
      ["Equipment:", equipment.equipmentName, "Model:", equipment.modelNumber],
      ["Serial No:", equipment.serialNumber, "Mfg Date:", equipment.manufacturingDate || "N/A"],
      ["Installed At:", equipment.installedAt || "N/A", "Install Date:", equipment.installationDate || "N/A"],
      ["Usage/Refill:", equipment.monthlyUsage || "N/A", "Remarks:", equipment.remarks || "OK"]
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } }
  });

  // 5. MAINTENANCE LOG
  const tableY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11).setFont("helvetica", "bold").text("MAINTENANCE LOG ENTRIES", 14, tableY);

  autoTable(doc, {
    startY: tableY + 4,
    head: [['Date', 'Vendor & Invoice', 'Nature of Repair', 'Amount (INR)']],
    body: equipment.repairs?.map((r: any) => [
      r.date || "---", 
      (r.vendorName || r.invoiceNo) ? `${r.vendorName || 'N/A'}\n${r.invoiceNo ? 'Inv: ' + r.invoiceNo : ''}`.trim() : "---",
      `${r.natureOfRepair || "---"}${r.remarks ? `\n(Note: ${r.remarks})` : ''}`, 
      r.amount || "0"
    ]) || [],
    headStyles: { fillColor: [212, 18, 23] }, 
    styles: { fontSize: 8, cellPadding: 2 }
  });

  // 6. FINAL COST & NOTICE BOX
  const finalLogY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(10).text(`Total Maintenance Cost: INR ${totalCost.toFixed(2)}`, 14, finalLogY + 10);

  if (isCondemned) {
    // ✅ NOTICE BOX (Double line hatayi gayi, Single Auth line rakhi)
    const boxY = pageHeight - 75; 
    doc.setDrawColor(220, 38, 38).setFillColor(254, 242, 242).setLineWidth(0.5);
    doc.roundedRect(15, boxY, 125, 30, 3, 3, 'FD');
    
    doc.setTextColor(185, 28, 28).setFontSize(11).setFont("helvetica", "bold");
    doc.text("IMPORTANT: EQUIPMENT CONDEMNATION NOTICE", 20, boxY + 10);
    
    doc.setTextColor(0).setFontSize(9).setFont("helvetica", "normal");
    doc.text("This equipment is officially marked as Condemned. No further repairs authorized.", 20, boxY + 18);
    
    // Single Line Only (As per SS)
    doc.setFont("helvetica", "bold");
    doc.text(`Auth Letter No: _______________________ Dated: ________`, 20, boxY + 26);
  }

  // Signature Section
  const footerY = pageHeight - 25;
  doc.setDrawColor(180).line(140, footerY, 190, footerY); 
  doc.setFontSize(10).setTextColor(0).text("Office Seal & Date", 165, footerY + 6, { align: "center" });

  if (isPreview) {
    const string = doc.output('datauristring');
    const x = window.open();
    if (x) {
      x.document.open();
      x.document.write(`<iframe width='100%' height='100%' src='${string}' style='border:none;'></iframe>`);
      x.document.close();
    }
  } else {
    doc.save(`${equipment.serialNumber}_Report.pdf`);
  }
};

export const generateServiceLogPDF = (equipment: any, ticket: any, repair: any) => {
  const doc = new jsPDF();
  
  // 1. HEADER & LOGO
  try { doc.addImage("/assets/india-post-logo.png", 'PNG', 15, 10, 25, 15); } catch (e) {}

  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(212, 18, 23); 
  doc.text("DEPARTMENT OF POSTS", 115, 18, { align: "center" });
  doc.setFontSize(14).setTextColor(0).text("Official Service Log", 115, 26, { align: "center" });

  doc.setFontSize(10);
  doc.text(`TICKET NO: ${ticket.ticketNo}`, 130, 38);
  doc.text(`DATE: ${repair?.date || new Date().toLocaleDateString('en-GB')}`, 130, 44);

  autoTable(doc, {
    startY: 55,
    head: [['Machine Details', '']],
    body: [
      ["Equipment:", `${equipment.equipmentName} (${equipment.modelNumber})`],
      ["Serial No:", equipment.serialNumber],
      ["Office:", `${equipment.officeName} | ${equipment.division}`],
    ],
    theme: 'grid', styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: [212, 18, 23] }
  });

  const yAfterEq = (doc as any).lastAutoTable.finalY + 10;
  
  autoTable(doc, {
    startY: yAfterEq,
    head: [['Reporter Information', '']],
    body: [
      ["Reporter Name:", ticket.reporterName || "N/A"],
      ["Branch:", ticket.reporterBranch || "N/A"],
      ["Mobile:", ticket.reporterMobile || "N/A"],
      ["Issue Description:", ticket.issueDescription || "N/A"]
    ],
    theme: 'grid', styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: [50, 50, 50] }
  });

  const yAfterRep = (doc as any).lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: yAfterRep,
    head: [['Admin Resolution Details', '']],
    body: [
      ["Nature of Work:", repair?.natureOfRepair || "N/A"],
      ["Vendor/Company:", repair?.vendorName || "N/A"],
      ["Invoice Number:", repair?.invoiceNo || "N/A"],
      ["Total Cost:", `INR ${repair?.amount || "0"}`],
      ["Admin Remarks:", repair?.remarks || "N/A"]
    ],
    theme: 'grid', styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: [34, 197, 94] }
  });

  const footerY = doc.internal.pageSize.height - 35;
  doc.setDrawColor(180).line(20, footerY, 70, footerY); 
  doc.setFontSize(10).setTextColor(0).text("Reporter Signature", 45, footerY + 6, { align: "center" });
  
  doc.line(140, footerY, 190, footerY); 
  doc.text("Office Seal & Sign", 165, footerY + 6, { align: "center" });

  doc.save(`${ticket.ticketNo}_ServiceLog.pdf`);
};