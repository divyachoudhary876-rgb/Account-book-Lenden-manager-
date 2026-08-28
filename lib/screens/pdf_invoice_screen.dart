import 'package:flutter/material.dart';
import '../utils/pdf_generator.dart';

class PdfInvoiceScreen extends StatelessWidget {
  const PdfInvoiceScreen({Key? key}) : super(key: Key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(title: const Text('Generate Invoice PDF'), backgroundColor: const Color(0xFF1E293B)),
      body: Center(
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: Colors.emerald),
          onPressed: () {
            PdfInvoiceGenerator.generateAndPrintTaxInvoice({
              'firmName': 'NEELKANTH GROUPS',
              'firmAddress': 'Main Road, Rajasthan',
              'firmGstin': '08AAAAA0000A1Z5',
              'invoiceNo': 'INV-2026-001',
              'date': '28/08/2026',
              'partyName': 'M/s Sharma Traders',
              'partyAddress': 'Jaipur, Rajasthan',
              'partyGstin': '08BBBPS1234A1ZD',
              'bankName': 'State Bank of India',
              'accountNo': '330011223344',
              'ifsc': 'SBIN0001234',
            });
          },
          child: const Text('Print / Export Professional PDF', style: TextStyle(color: Colors.white)),
        ),
      ),
    );
  }
}
