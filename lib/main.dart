import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

void main() {
  runApp(const AccountingApp());
}

class AccountingApp extends StatelessWidget {
  const AccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Neelkanth Account Book',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        primaryColor: const Color(0xFF10B981),
        cardColor: const Color(0xFF1E293B),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const VoucherEntryScreen(),
    const DayBookScreen(),
    const LedgerBookScreen(),
    const InvoiceScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF1E293B),
        selectedItemColor: const Color(0xFF10B981),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.edit_document), label: 'Voucher'),
          BottomNavigationBarItem(icon: Icon(Icons.menu_book), label: 'Day Book'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet), label: 'Ledger'),
          BottomNavigationBarItem(icon: Icon(Icons.picture_as_pdf), label: 'Invoice'),
        ],
      ),
    );
  }
}

// 1. VOUCHER ENTRY TERMINAL
class VoucherEntryScreen extends StatefulWidget {
  const VoucherEntryScreen({super.key});

  @override
  State<VoucherEntryScreen> createState() => _VoucherEntryScreenState();
}

class _VoucherEntryScreenState extends State<VoucherEntryScreen> {
  String voucherType = 'Sales';
  final List<Map<String, dynamic>> _entries = [
    {'type': 'DEBIT', 'account': 'Cash in Hand', 'amount': 0.0},
    {'type': 'CREDIT', 'account': 'Sales Account', 'amount': 0.0},
  ];

  double get _totalDebit => _entries
      .where((e) => e['type'] == 'DEBIT')
      .fold(0.0, (sum, e) => sum + (e['amount'] ?? 0.0));

  double get _totalCredit => _entries
      .where((e) => e['type'] == 'CREDIT')
      .fold(0.0, (sum, e) => sum + (e['amount'] ?? 0.0));

  bool get _isBalanced => (_totalDebit - _totalCredit).abs() < 0.001 && _totalDebit > 0;

  @override
  Widget build(BuildContext context) {
    const Color emeraldColor = Color(0xFF10B981);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Voucher & Journal Entry'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['Sales', 'Purchase', 'Payment', 'Receipt', 'Journal'].map((type) {
                  final isSelected = voucherType == type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(type),
                      selected: isSelected,
                      selectedColor: emeraldColor,
                      onSelected: (val) => setState(() => voucherType = type),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isBalanced ? emeraldColor.withOpacity(0.15) : Colors.amber.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _isBalanced ? emeraldColor : Colors.amber),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _isBalanced ? '✓ Journal Balanced' : '⚠ Diff: ₹${(_totalDebit - _totalCredit).abs().toStringAsFixed(2)}',
                    style: TextStyle(color: _isBalanced ? emeraldColor : Colors.amberAccent, fontWeight: FontWeight.bold),
                  ),
                  Text('Dr: ₹${_totalDebit.toStringAsFixed(2)} | Cr: ₹${_totalCredit.toStringAsFixed(2)}',
                      style: const TextStyle(color: Colors.white, fontFamily: 'monospace')),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: _entries.length,
                itemBuilder: (context, index) {
                  return Card(
                    color: const Color(0xFF1E293B),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              DropdownButton<String>(
                                value: _entries[index]['type'],
                                dropdownColor: const Color(0xFF0F172A),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                items: const [
                                  DropdownMenuItem(value: 'DEBIT', child: Text('By (Dr.)')),
                                  DropdownMenuItem(value: 'CREDIT', child: Text('To (Cr.)')),
                                ],
                                onChanged: (val) => setState(() => _entries[index]['type'] = val),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: TextEditingController(text: _entries[index]['account']),
                                  style: const TextStyle(color: Colors.white),
                                  decoration: const InputDecoration(
                                    hintText: 'Account ID/Name',
                                    hintStyle: TextStyle(color: Colors.grey),
                                  ),
                                  onChanged: (val) => _entries[index]['account'] = val,
                                ),
                              ),
                              const SizedBox(width: 8),
                              SizedBox(
                                width: 90,
                                child: TextField(
                                  keyboardType: TextInputType.number,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: const InputDecoration(
                                    hintText: '0.00',
                                    hintStyle: TextStyle(color: Colors.grey),
                                  ),
                                  onChanged: (val) {
                                    setState(() {
                                      _entries[index]['amount'] = double.tryParse(val) ?? 0.0;
                                    });
                                  },
                                ),
                              ),
                            ],
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: 4.0, left: 4.0),
                            child: Text(
                              '💡 Suggestion: Select account to ${_entries[index]['type'].toString().toLowerCase()}',
                              style: const TextStyle(color: Colors.grey, fontSize: 10),
                            ),
                          )
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _entries.add({'type': 'DEBIT', 'account': '', 'amount': 0.0});
                    });
                  },
                  icon: const Icon(Icons.add, color: emeraldColor),
                  label: const Text('Add Line', style: TextStyle(color: emeraldColor)),
                ),
                ElevatedButton(
                  onPressed: _isBalanced ? () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('$voucherType Voucher Posted Successfully!')),
                    );
                  } : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: emeraldColor,
                    disabledBackgroundColor: Colors.grey.withOpacity(0.2),
                  ),
                  child: Text('Post $voucherType Voucher', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

// 2. DAY BOOK SCREEN
class DayBookScreen extends StatelessWidget {
  const DayBookScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Day Book (Double Entry)'), backgroundColor: const Color(0xFF1E293B)),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          _buildDayBookTile('VOUCH-1001', 'By Cash in Hand (Dr.)', 'To Sales Account (Cr.)', '15,000.00', '28 Aug 2026'),
          _buildDayBookTile('VOUCH-1002', 'By Office Stationery (Dr.)', 'To HDFC Bank A/c (Cr.)', '1,200.00', '28 Aug 2026'),
        ],
      ),
    );
  }

  Widget _buildDayBookTile(String vouchNo, String dr, String cr, String amount, String date) {
    return Card(
      color: const Color(0xFF1E293B),
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        title: Text(dr, style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(cr, style: const TextStyle(color: Colors.grey)),
            Text('Voucher #: $vouchNo | Date: $date', style: const TextStyle(color: Colors.grey, fontSize: 11)),
          ],
        ),
        trailing: Text('₹$amount', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15, fontFamily: 'monospace')),
      ),
    );
  }
}

// 3. LEDGER BOOK SCREEN
class LedgerBookScreen extends StatelessWidget {
  const LedgerBookScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Account Ledger Book'), backgroundColor: const Color(0xFF1E293B)),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: const Color(0xFF1E293B),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Text('Account: Cash in Hand', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                Text('Balance: ₹58,800.00 Dr', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'monospace')),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: const [
                ListTile(
                  title: Text('To Sales Account', style: TextStyle(color: Colors.white)),
                  subtitle: Text('28 Aug 2026 | Voucher #VOUCH-1001', style: TextStyle(color: Colors.grey)),
                  trailing: Text('+ ₹15,000.00', style: TextStyle(color: Color(0xFF10B981), fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                ),
                Divider(color: Colors.grey),
                ListTile(
                  title: Text('By Office Expense', style: TextStyle(color: Colors.white)),
                  subtitle: Text('28 Aug 2026 | Voucher #VOUCH-1002', style: TextStyle(color: Colors.grey)),
                  trailing: Text('- ₹1,200.00', style: TextStyle(color: Colors.redAccent, fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

// 4. TAX INVOICE PDF GENERATOR
class InvoiceScreen extends StatelessWidget {
  const InvoiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tax Invoice Engine'), backgroundColor: const Color(0xFF1E293B)),
      body: Center(
        child: ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          ),
          icon: const Icon(Icons.print, color: Colors.white),
          label: const Text('Generate Professional PDF Invoice', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          onPressed: () => _generateInvoicePDF(),
        ),
      ),
    );
  }

  Future<void> _generateInvoicePDF() async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(24),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('NEELKANTH GROUPS', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
                        pw.Text('Industrial Area, Rajasthan, India'),
                        pw.Text('GSTIN: 08AAAAA0000A1Z5'),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text('TAX INVOICE', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.green700)),
                        pw.Text('Invoice #: INV-2026-001'),
                        pw.Text('Date: 28/08/2026'),
                      ],
                    ),
                  ],
                ),
                pw.Divider(),
                pw.SizedBox(height: 10),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Container(
                      width: 220,
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey400)),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('BILLED TO (PARTY):', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                          pw.Text('M/s Sharma & Sons', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                          pw.Text('Jaipur, Rajasthan'),
                          pw.Text('GSTIN: 08BBBPS1234A1ZD'),
                        ],
                      ),
                    ),
                    pw.Container(
                      width: 220,
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey400)),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('BANK DETAILS:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                          pw.Text('Bank: State Bank of India'),
                          pw.Text('A/C No: 330011223344'),
                          pw.Text('IFSC Code: SBIN0001234'),
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
