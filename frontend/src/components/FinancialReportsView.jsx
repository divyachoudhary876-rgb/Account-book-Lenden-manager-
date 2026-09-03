// Ensure this import is at the top of FinancialReportsView.jsx:
import { downloadFinancialStatementsReport } from '../utils/pdfDownloadEngine.js';

// Inside your FinancialReportsView component:
const [isExporting, setIsExporting] = useState(false);

const handlePrintReport = async () => {
  try {
    setIsExporting(true);
    // Tab indicator: activeTab can be 'TB' or 1 for Trial Balance
    const result = await downloadFinancialStatementsReport(
      firm || 'Neelkanth Int Udyog',
      reportData,
      activeTab || 'TB'
    );
    if (!result) {
      alert('Report downloaded to device storage.');
    }
  } catch (err) {
    console.error('Report export failure:', err);
    alert('Report generation failed: ' + (err.message || 'Please retry.'));
  } finally {
    setIsExporting(false);
  }
};

// And in your JSX for the Print button:
<button
  onClick={handlePrintReport}
  disabled={isExporting}
  className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-1 hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
>
  <span>🖨️</span>
  <span>{isExporting ? 'Generating...' : 'Print Report'}</span>
</button>
