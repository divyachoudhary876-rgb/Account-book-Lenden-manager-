import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class PdfInvoiceGenerator {
  static Future<void> generateAndPrintTaxInvoice(Map<String, dynamic> invoiceData) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(24),
            child: pw.Column(
              cross: pw.CrossAxisAlignment.start,
              children: [
                // Header Details
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      cross: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(invoiceData['firmName'] ?? 'FIRM NAME',
                            style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
                        pw.Text(invoiceData['firmAddress'] ?? 'Address Details'),
                        pw.Text('GSTIN: ${invoiceData['firmGstin'] ?? 'N/A'}'),
                      ],
                    ),
                    pw.Column(
                      cross: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text('TAX INVOICE',
                            style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.green700)),
                        pw.Text('Invoice #: ${invoiceData['invoiceNo']}'),
                        pw.Text('Date: ${invoiceData['date']}'),
                      ],
                    ),
                  ],
                ),
                pw.Divider(),
                pw.SizedBox(height: 10),

                // Party & Bank Info Grid
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Container(
                      width: 230,
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey400)),
                      child: pw.Column(
                        cross: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('BILLED TO (PARTY):', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                          pw.Text(invoiceData['partyName'] ?? '', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                          pw.Text(invoiceData['partyAddress'] ?? ''),
                          pw.Text('GSTIN: ${invoiceData['partyGstin'] ?? 'N/A'}'),
                        ],
                      ),
                    ),
                    pw.Container(
                      width: 230,
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey400)),
                      child: pw.Column(
                        cross: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('BANK REMITTANCE DETAILS:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                          pw.Text('Bank: ${invoiceData['bankName'] ?? ''}'),
                          pw.Text('A/C No: ${invoiceData['accountNo'] ?? ''}'),
                          pw.Text('IFSC Code: ${invoiceData['ifsc'] ?? ''}'),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}
