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

export const generateUnifiedLogPDF = (equipment: any, ticket: any) => {
  const doc = new jsPDF();
  const isResolved = ticket.status === 'resolved' || ticket.status === 'archived';
  
  // 1. HEADER & LOGO (Improved Modern Layout)
  try { doc.addImage("/assets/india-post-logo.png", 'PNG', 15, 10, 22, 13); } catch (e) {}

  doc.setFont("helvetica", "bold").setFontSize(28).setTextColor(212, 18, 23); 
  doc.text("DEPARTMENT OF POSTS", 105, 18, { align: "center" });
  doc.setFontSize(10).setTextColor(80).setFont("helvetica", "bold").text("GOVERNMENT OF INDIA | OFFICIAL SERVICE LOG", 105, 23, { align: "center" });
  
  // 2. TICKET ID SECTION (Premium Styled Box)
  doc.setDrawColor(212, 18, 23).setLineWidth(1.0);
  doc.line(15, 27, 195, 27); 
  
  doc.setDrawColor(15, 23, 42).setLineWidth(0.5).setFillColor(255, 255, 255);
  doc.roundedRect(65, 29, 80, 15, 3, 3, 'FD'); 
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(100).text("OFFICIAL SERVICE TICKET ID", 105, 34, { align: "center" });
  doc.setFontSize(15).setTextColor(15, 23, 42).text(ticket.ticketNo || "N/A", 105, 41, { align: "center" });

  // 3. MACHINE DETAILS SECTION
  autoTable(doc, {
    startY: 45, // Pushed down to avoid overlap
    head: [['ASSET SPECIFICATIONS', '']],
    body: [
      ["Machine Name:", `${equipment.equipmentName} (${equipment.modelNumber || '---'})`],
      ["Serial Number:", equipment.serialNumber || "N/A"],
      ["Office Location:", `${equipment.officeName} | ${equipment.division}`],
      ["Fault Category:", (ticket.fault || "GENERAL").toUpperCase()],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [212, 18, 23], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] } }
  });

  const yAfterEq = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: yAfterEq,
    head: [['ORIGINAL FAULT REPORT', '']],
    body: [
      ["Reporting Officer:", ticket.reporterName || "N/A"],
      ["Section/Branch:", ticket.reporterBranch || "N/A"],
      ["Contact Number:", ticket.reporterMobile || "N/A"],
      ["Issue Description:", ticket.issueDescription?.split(' ||| ')[0] || "N/A"],
      ["Reported At:", ticket.createdAt || "N/A"],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] } }
  });

  if (isResolved) {
    const yAfterRep = (doc as any).lastAutoTable.finalY + 8;
    
    const resNature = ticket.resolveNature || "Verified Technical Repair";
    const resVendor = ticket.resolveVendor || "DOP In-House Service";
    const resInvoice = ticket.resolveInvoice || "Official Log Only";
    const resAmount = ticket.resolveAmount || "0";
    const resRemarks = ticket.resolveRemarks || "Service completed and verified.";
    const resDate = ticket.resolveDate || ticket.createdAt?.split(',')[0] || "---";

    autoTable(doc, {
      startY: yAfterRep,
      head: [['OFFICIAL RESOLUTION & SERVICE SUMMARY', '']],
      body: [
        ["Nature of Work:", resNature],
        ["Vendor/Agency:", resVendor],
        ["Invoice Number:", resInvoice],
        ["Resolution Date:", resDate],
        ["Total Cost:", `INR ${resAmount}`],
        ["Technical Notes:", resRemarks],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: "helvetica" },
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] } }
    });
  }

  // 5. SIGNATURE & AUTHENTICATION
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 40;
  
  // Stamp Circle
  doc.setDrawColor(5, 150, 105).setLineWidth(0.5);
  doc.circle(40, footerY - 5, 8);
  doc.setFontSize(5).setTextColor(5, 150, 105).setFont("helvetica", "bold");
  doc.text("VERIFIED", 40, footerY - 8, { align: "center" });
  doc.text("DIGITAL", 40, footerY - 5, { align: "center" });
  doc.text("LOG", 40, footerY - 2, { align: "center" });

  doc.setDrawColor(200).setLineWidth(0.2);
  doc.line(20, footerY + 15, 80, footerY + 15);
  doc.line(130, footerY + 15, 190, footerY + 15);
  
  doc.setFontSize(8).setTextColor(100).setFont("helvetica", "bold");
  doc.text("Reporting Officer Signature", 50, footerY + 20, { align: "center" });
  doc.text("Office Seal & Signatory", 160, footerY + 20, { align: "center" });

  doc.setFontSize(7).setTextColor(150).setFont("helvetica", "normal");
  doc.text("This is a computer-generated official document. No physical signature required for standard filing.", 105, footerY + 30, { align: "center" });

  doc.save(`${ticket.ticketNo}_Official_Log.pdf`);
};

export const generateCoveringLetterPDF = async (data: any) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // 1. Header (Logo & Name)
  try { doc.addImage("/assets/india-post-logo.png", 'PNG', 15, 10, 22, 13); } catch (e) {}
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(212, 18, 23); 
  doc.text("DEPARTMENT OF POSTS", 105, 17, { align: "center" });
  doc.setFontSize(9).setTextColor(100).text("OFFICIAL CORRESPONDENCE UNIT", 105, 22, { align: "center" });

  // 2. Metadata (Date & Letter No)
  doc.setDrawColor(200).line(15, 28, pageWidth - 15, 28);
  doc.setFontSize(10).setTextColor(0).setFont("helvetica", "bold");
  doc.text(`LETTER NO: ${data.letterNo || '---'}`, 15, 36);
  doc.text(`DATE: ${data.date || '---'}`, pageWidth - 15, 36, { align: "right" });

  // 3. Addresses (To & From)
  let currentY = 48;
  doc.setFont("helvetica", "bold").setFontSize(10).text("TO,", 15, currentY);
  doc.setFont("helvetica", "normal").text(data.recipient || "---", 20, currentY + 6);
  
  currentY += 20;
  doc.setFont("helvetica", "bold").text("FROM,", 15, currentY);
  doc.setFont("helvetica", "normal").text(data.sender || "---", 20, currentY + 6);

  // 4. Subject
  currentY += 20;
  doc.setFont("helvetica", "bold").text(`SUBJECT: ${data.subject || '---'}`, 15, currentY, { maxWidth: pageWidth - 30 });
  doc.line(15, currentY + 2, 15 + doc.getTextWidth(`SUBJECT: ${data.subject || ''}`), currentY + 2);

  // 5. Salutation & Body
  currentY += 15;
  doc.setFont("helvetica", "normal").text("Madam/Sir,", 15, currentY);
  
  const bodyLines = doc.splitTextToSize(data.body || "", pageWidth - 30);
  doc.text(bodyLines, 15, currentY + 10);

  // 6. Signature
  const finalY = currentY + 15 + (bodyLines.length * 5);
  doc.setFont("helvetica", "bold").text("Sincerely,", pageWidth - 15, finalY + 15, { align: "right" });
  doc.setFont("helvetica", "normal").text(`${data.sender || '---'}`, pageWidth - 15, finalY + 25, { align: "right" });
  doc.setFontSize(8).setTextColor(150).text("(Digital Signature Applied)", pageWidth - 15, finalY + 30, { align: "right" });

  // 7. Smart Attachment Merging
  if (data.attachmentData && data.attachmentData.length > 0) {
    for (const attachment of data.attachmentData) {
      doc.addPage();
      const isImage = attachment.type.startsWith('image/');
      
      if (isImage) {
        // Center image on page
        const imgWidth = pageWidth - 20;
        const imgHeight = (imgWidth * 0.7); // Roughly 4:3
        doc.addImage(attachment.data, 'JPEG', 10, 10, imgWidth, imgHeight);
        doc.setFontSize(8).text(`Attachment: ${attachment.name}`, 105, imgHeight + 20, { align: "center" });
      } else {
        doc.setFontSize(12).text(`Note: Attachment "${attachment.name}" is a PDF file.`, 105, 100, { align: "center" });
        doc.setFontSize(8).text("(Due to library constraints, PDF merging is visual only in this version)", 105, 110, { align: "center" });
      }
    }
  }

  doc.save(`${data.letterNo || 'Letter'}_Draft.pdf`);
};

export const generateServiceLogPDF = (equipment: any, ticket: any, repair: any) => {
  // Keeping this for backward compatibility or direct calls
  generateUnifiedLogPDF(equipment, ticket);
};