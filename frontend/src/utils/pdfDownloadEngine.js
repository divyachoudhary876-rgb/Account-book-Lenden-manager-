// frontend/src/utils/pdfDownloadEngine.js

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

export const downloadElementAsPDF = async (elementId, fileName) => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('PDF Generation Error: Element not found!');
    return;
  }

  const options = {
    margin: [8, 8, 8, 8],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    // Check if running inside Native Mobile App (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      // 1. Generate PDF as Base64 String
      const pdfBase64 = await html2pdf().set(options).from(element).outputPdf('datauristring');
      const base64CleanData = pdfBase64.split(',')[1];

      // 2. Save directly to Android Device Documents Directory
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64CleanData,
        directory: Directory.Documents,
        recursive: true
      });

      // 3. Trigger Native Mobile Share & Save Popup
      await Share.share({
        title: 'Save or Share PDF',
        text: `PDF Document: ${fileName}`,
        url: savedFile.uri,
        dialogTitle: 'PDF Downloaded Successfully'
      });

    } else {
      // Direct Web / PC Browser Download Fallback
      await html2pdf().set(options).from(element).save();
    }
  } catch (error) {
    console.error('Mobile PDF Download Engine Failed:', error);
    // Emergency Fallback
    window.print();
  }
};
