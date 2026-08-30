// frontend/src/utils/pdfDownloadEngine.js

export const downloadElementAsPDF = (elementId, documentTitle = 'Financial_Report') => {
  const printElement = document.getElementById(elementId);
  if (!printElement) {
    alert("❌ Error: Printable report content not found.");
    return false;
  }

  const printWindow = window.open('', '_blank', 'height=650,width=900');
  if (!printWindow) {
    alert("⚠️ Please allow popups in your browser to download PDF reports.");
    return false;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${documentTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; }
          .text-right { text-align: right; }
          .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          @media print {
            @page { size: A4 portrait; margin: 12mm; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printElement.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);

  return true;
};
