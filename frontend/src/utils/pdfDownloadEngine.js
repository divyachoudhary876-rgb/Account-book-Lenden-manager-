// frontend/src/utils/pdfDownloadEngine.js

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

export const downloadElementAsPDF = async (elementId, partyName) => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('PDF Engine Error: Target DOM element missing.');
    return;
  }

  const fileName = `${partyName.replace(/\s+/g, '_')}_Ledger_Statement.pdf`;

  const options = {
    margin: [8, 8, 8, 8],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    // 1. Android/iOS Mobile App Native Storage Logic
    if (Capacitor.isNativePlatform()) {
      const pdfBase64 = await html2pdf().set(options).from(element).outputPdf('datauristring');
      const base64CleanData = pdfBase64.split(',')[1];

      // File Write to Mobile Device Storage
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64CleanData,
        directory: Directory.Cache
      });

      // Trigger Android System Share Popup
      await Share.share({
        title: `${partyName} - Ledger Statement`,
        text: `Kripya ${partyName} ka Complete Account Milan PDF Document attach dekhein.`,
        url: savedFile.uri,
        dialogTitle: 'Save or Share PDF (WhatsApp / Email)'
      });

    } else {
      // 2. PC / Laptop Web Browser Fallback
      await html2pdf().set(options).from(element).save();
    }
  } catch (error) {
    console.error('PDF Native Engine Execution Failed:', error);
    // Safety Fallback for PC
    window.print();
  }
};
