// frontend/src/utils/pdfDownloadEngine.js

import html2pdf from 'html2pdf.js';

export const downloadElementAsPDF = async (elementId, fileName = 'Financial_Report') => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("❌ Error: Target printable element not found on page.");
    return false;
  }

  const opt = {
    margin:       [0.4, 0.4, 0.4, 0.4],
    filename:     `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert(`❌ PDF Generation Failed: ${error.message}`);
    return false;
  }
};
