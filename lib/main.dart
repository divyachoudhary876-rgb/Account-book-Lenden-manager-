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
      title: 'Neelkanth Accounting Enterprise',
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

// ==========================================
// CENTRAL STATE & INVENTORY ENGINE
// ==========================================
class AppState {
  static String activeFirmId = 'firm_1';

  static List<Map<String, String>> firms = [
    {'id': 'firm_1', 'name': 'Neelkanth Biomass Briquettes'},
    {'id': 'firm_2', 'name': 'Neelkanth Brick Kiln (Int Bhatta)'},
  ];

  static List<Map<String, dynamic>> accounts = [
    {'id': 'acc_1', 'firmId': 'firm_1', 'name': 'Cash in Hand', 'category': 'Asset', 'balance': 50000.0},
    {'id': 'acc_2', 'firmId': 'firm_1', 'name': 'Sales Account', 'category': 'Revenue', 'balance': 0.0},
    {'id': 'acc_3', 'firmId': 'firm_1', 'name': 'HDFC Bank A/c', 'category': 'Asset', 'balance': 120000.0},
    {'id': 'acc_4', 'firmId': 'firm_2', 'name': 'Cash Account Bhatta', 'category': 'Asset', 'balance': 25000.0},
  ];

  static List<Map<String, dynamic>> stockItems = [
    {'id': 'item_1', 'firmId': 'firm_1', 'name': 'Mustard Briquettes', 'hsn': '4401', 'unit': 'Tons', 'qty': 150.0, 'rate': 4500.0},
    {'id': 'item_2', 'firmId': 'firm_2', 'name': 'First Class Bricks (Int)', 'hsn': '6901', 'unit': 'Thousands', 'qty': 80.0, 'rate': 5500.0},
  ];

  static List<Map<String, dynamic>> vouchers = [];

  static List<Map<String, dynamic>> getActiveAccounts() {
    return accounts.where((a) => a['firmId'] == activeFirmId).toList();
  }

  static List<Map<String, dynamic>> getActiveStock() {
    return stockItems.where((i) => i['firmId'] == activeFirmId).toList();
  }

  static List<Map<String, dynamic>> getActiveVouchers() {
    return vouchers.where((v) => v['firmId'] == activeFirmId).toList();
  }

  static void addAccount(String name, String category) {
    accounts.add({
      'id': 'acc_${DateTime.now().millisecondsSinceEpoch}',
      'firmId': activeFirmId,
      'name': name,
      'category': category,
      'balance': 0.0,
    });
  }

  static void addStockItem(String name, String hsn, String unit, double qty, double rate) {
    stockItems.add({
      'id': 'item_${DateTime.now().millisecondsSinceEpoch}',
      'firmId': activeFirmId,
      'name': name,
      'hsn': hsn,
      'unit': unit,
      'qty': qty,
      'rate': rate,
    });
  }

  static void postVoucher(String type, String voucherNo, List<Map<String, dynamic>> entries) {
    vouchers.add({
      'id': 'vouch_${DateTime.now().millisecondsSinceEpoch}',
      'firmId': activeFirmId,
      'voucherNo': voucherNo,
      'type': type,
      'date': '28 Aug 2026',
      'entries': entries,
    });

    for (var entry in entries) {
      final acc = accounts.firstWhere((a) => a['name'] == entry['account'], orElse: () => {});
      if (acc.isNotEmpty) {
        double amt = entry['amount'] ?? 0.0;
        if (entry['type'] == 'DEBIT') {
          acc['balance'] = (acc['balance'] as double) + amt;
        } else {
          acc['balance'] = (acc['balance'] as double) - amt;
        }
      }
    }
  }
}

// ==========================================
// NAVIGATION CONTROLLER
// ==========================================
class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  void _refreshState() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      VoucherEntryScreen(onUpdate: _refreshState),
      const DayBookScreen(),
      const LedgerBookScreen(),
      StockInventoryScreen(onUpdate: _refreshState),
      AccountManagementScreen(onUpdate: _refreshState),
      const InvoiceScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: DropdownButton<String>(
          value: AppState.activeFirmId,
          dropdownColor: const Color(0xFF0F172A),
          underline: const SizedBox(),
          style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 15),
          items: AppState.firms.map((firm) {
            return DropdownMenuItem<String>(
              value: firm['id'],
              child: Text('🏢 ${firm['name']}'),
            );
          }).toList(),
          onChanged: (val) {
            setState(() {
              AppState.activeFirmId = val!;
            });
          },
        ),
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF1E293B),
        selectedItemColor: const Color(0xFF10B981),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.edit_note), label: 'Voucher'),
          BottomNavigationBarItem(icon: Icon(Icons.auto_stories), label: 'Day Book'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet), label: 'Ledger'),
          BottomNavigationBarItem(icon: Icon(Icons.inventory), label: 'Stock'),
          BottomNavigationBarItem(icon: Icon(Icons.person_add), label: 'Accounts'),
          BottomNavigationBarItem(icon: Icon(Icons.print), label: 'Invoice'),
        ],
      ),
    );
  }
}

// ==========================================
// 1. VOUCHER ENTRY TERMINAL
// ==========================================
class VoucherEntryScreen extends StatefulWidget {
  final VoidCallback onUpdate;
  const VoucherEntryScreen({super.key, required this.onUpdate});

  @override
  State<VoucherEntryScreen> createState() => _VoucherEntryScreenState();
}

class _VoucherEntryScreenState extends State<VoucherEntryScreen> {
  String voucherType = 'Sales';
  final List<Map<String, dynamic>> _entries = [
    {'type': 'DEBIT', 'account': '', 'amount': 0.0},
    {'type': 'CREDIT', 'account': '', 'amount': 0.0},
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
    final activeAccounts = AppState.getActiveAccounts();

    return Scaffold(
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
            const SizedBox(height: 12),
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
                    _isBalanced ? '✓ Balanced' : '⚠ Diff: ₹${(_totalDebit - _totalCredit).abs().toStringAsFixed(2)}',
                    style: TextStyle(color: _isBalanced ? emeraldColor : Colors.amberAccent, fontWeight: FontWeight.bold),
                  ),
                  Text('Dr: ₹${_totalDebit.toStringAsFixed(2)} | Cr: ₹${_totalCredit.toStringAsFixed(2)}',
                      style: const TextStyle(color: Colors.white, fontFamily: 'monospace')),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: _entries.length,
                itemBuilder: (context, index) {
                  return Card(
                    color: const Color(0xFF1E293B),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Row(
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
                            child: DropdownButtonFormField<String>(
                              dropdownColor: const Color(0xFF0F172A),
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              decoration: const InputDecoration(hintText: 'Select Account', hintStyle: TextStyle(color: Colors.grey)),
                              items: activeAccounts.map((acc) {
                                return DropdownMenuItem<String>(
                                  value: acc['name'] as String,
                                  child: Text(acc['name'] as String),
                                );
                              }).toList(),
                              onChanged: (val) => setState(() => _entries[index]['account'] = val!),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            width: 85,
                            child: TextField(
                              keyboardType: TextInputType.number,
                              style: const TextStyle(color: Colors.white),
                              decoration: const InputDecoration(hintText: '0.00'),
                              onChanged: (val) {
                                setState(() {
                                  _entries[index]['amount'] = double.tryParse(val) ?? 0.0;
                                });
                              },
                            ),
                          ),
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
                  onPressed: () => setState(() => _entries.add({'type': 'DEBIT', 'account': '', 'amount': 0.0})),
                  icon: const Icon(Icons.add, color: emeraldColor),
                  label: const Text('Add Row', style: TextStyle(color: emeraldColor)),
                ),
                ElevatedButton(
                  onPressed: _isBalanced
                      ? () {
                          AppState.postVoucher(voucherType, 'VOUCH-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}', _entries);
                          widget.onUpdate();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('$voucherType Voucher Posted & Ledger Updated!')),
                          );
                        }
                      : null,
                  style: ElevatedButton.styleFrom(backgroundColor: emeraldColor),
                  child: const Text('Post Voucher', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 2. DAY BOOK SCREEN
// ==========================================
class DayBookScreen extends StatelessWidget {
  const DayBookScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final activeVouchers = AppState.getActiveVouchers();

    return Scaffold(
      body: activeVouchers.isEmpty
          ? const Center(child: Text('No Vouchers Posted for this Firm Yet.', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: activeVouchers.length,
              itemBuilder: (context, index) {
                final v = activeVouchers[index];
                final entries = v['entries'] as List<Map<String, dynamic>>;
                final dr = entries.firstWhere((e) => e['type'] == 'DEBIT', orElse: () => {'account': 'N/A', 'amount': 0.0});
                final cr = entries.firstWhere((e) => e['type'] == 'CREDIT', orElse: () => {'account': 'N/A', 'amount': 0.0});

                return Card(
                  color: const Color(0xFF1E293B),
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text('By ${dr['account']} (Dr.)', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('To ${cr['account']} (Cr.)', style: const TextStyle(color: Colors.grey)),
                        Text('Voucher #: ${v['voucherNo']} | Date: ${v['date']}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                      ],
                    ),
                    trailing: Text('₹${(dr['amount'] as double).toStringAsFixed(2)}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15, fontFamily: 'monospace')),
                  ),
                );
              },
            ),
    );
  }
}

// ==========================================
// 3. LEDGER BOOK SCREEN
// ==========================================
class LedgerBookScreen extends StatelessWidget {
  const LedgerBookScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final activeAccounts = AppState.getActiveAccounts();

    return Scaffold(
      body: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: activeAccounts.length,
        itemBuilder: (context, index) {
          final acc = activeAccounts[index];
          final bal = acc['balance'] as double;

          return Card(
            color: const Color(0xFF1E293B),
            child: ListTile(
              title: Text(acc['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              subtitle: Text('Category: ${acc['category']}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
              trailing: Text(
                '₹${bal.abs().toStringAsFixed(2)} ${bal >= 0 ? "Dr" : "Cr"}',
                style: TextStyle(
                  color: bal >= 0 ? const Color(0xFF10B981) : Colors.redAccent,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                  fontSize: 15,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ==========================================
// 4. INVENTORY & STOCK MANAGEMENT
// ==========================================
class StockInventoryScreen extends StatefulWidget {
  final VoidCallback onUpdate;
  const StockInventoryScreen({super.key, required this.onUpdate});

  @override
  State<StockInventoryScreen> createState() => _StockInventoryScreenState();
}

class _StockInventoryScreenState extends State<StockInventoryScreen> {
  final _nameController = TextEditingController();
  final _hsnController = TextEditingController();
  final _qtyController = TextEditingController();
  final _rateController = TextEditingController();
  String _unit = 'Tons';

  @override
  Widget build(BuildContext context) {
    final activeStock = AppState.getActiveStock();

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Card(
              color: const Color(0xFF1E293B),
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Add New Stock / Inventory Item', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _nameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(hintText: 'Item Name (e.g. Mustard Briquettes / Bricks)'),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _hsnController,
                            style: const TextStyle(color: Colors.white),
                            decoration: const InputDecoration(hintText: 'HSN Code'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _qtyController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: Colors.white),
                            decoration: const InputDecoration(hintText: 'Qty'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _rateController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: Colors.white),
                            decoration: const InputDecoration(hintText: 'Rate (₹)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        DropdownButton<String>(
                          value: _unit,
                          dropdownColor: const Color(0xFF0F172A),
                          style: const TextStyle(color: Colors.white),
                          items: ['Tons', 'Thousands', 'Kg', 'Bags', 'Pcs'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                          onChanged: (val) => setState(() => _unit = val!),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            if (_nameController.text.isNotEmpty) {
                              AppState.addStockItem(
                                _nameController.text,
                                _hsnController.text,
                                _unit,
                                double.tryParse(_qtyController.text) ?? 0.0,
                                double.tryParse(_rateController.text) ?? 0.0,
                              );
                              _nameController.clear();
                              _hsnController.clear();
                              _qtyController.clear();
                              _rateController.clear();
                              widget.onUpdate();
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Stock Item Added Successfully!')));
                            }
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                          child: const Text('Save Stock Item', style: TextStyle(color: Colors.white)),
                        )
                      ],
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: activeStock.length,
                itemBuilder: (context, idx) {
                  final item = activeStock[idx];
                  double val = (item['qty'] as double) * (item['rate'] as double);

                  return Card(
                    color: const Color(0xFF1E293B),
                    child: ListTile(
                      title: Text(item['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      subtitle: Text('HSN: ${item['hsn']} | Stock: ${item['qty']} ${item['unit']} @ ₹${item['rate']}',
                          style: const TextStyle(color: Colors.grey, fontSize: 11)),
                      trailing: Text('₹${val.toStringAsFixed(2)}',
                          style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                    ),
                  );
                },
              ),
            )
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 5. CHART OF ACCOUNTS (MANAGE PARTIES)
// ==========================================
class AccountManagementScreen extends StatefulWidget {
  final VoidCallback onUpdate;
  const AccountManagementScreen({super.key, required this.onUpdate});

  @override
  State<AccountManagementScreen> createState() => _AccountManagementScreenState();
}

class _AccountManagementScreenState extends State<AccountManagementScreen> {
  final _nameController = TextEditingController();
  String _category = 'Asset';

  @override
  Widget build(BuildContext context) {
    final activeAccounts = AppState.getActiveAccounts();

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Card(
              color: const Color(0xFF1E293B),
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Create New Ledger Account / Party', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _nameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(hintText: 'Party / Account Name (e.g. Sharma Traders)'),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Text('Type: ', style: TextStyle(color: Colors.grey)),
                        DropdownButton<String>(
                          value: _category,
                          dropdownColor: const Color(0xFF0F172A),
                          style: const TextStyle(color: Colors.white),
                          items: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((cat) {
                            return DropdownMenuItem(value: cat, child: Text(cat));
                          }).toList(),
                          onChanged: (val) => setState(() => _category = val!),
                        ),
                        const Spacer(),
                        ElevatedButton(
                          onPressed: () {
                            if (_nameController.text.isNotEmpty) {
                              AppState.addAccount(_nameController.text, _category);
                              _nameController.clear();
                              widget.onUpdate();
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account Created Successfully!')));
                            }
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                          child: const Text('Save Account', style: TextStyle(color: Colors.white)),
                        )
                      ],
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: activeAccounts.length,
                itemBuilder: (context, idx) {
                  return ListTile(
                    title: Text(activeAccounts[idx]['name'], style: const TextStyle(color: Colors.white)),
                    subtitle: Text(activeAccounts[idx]['category'], style: const TextStyle(color: Colors.grey)),
                  );
                },
              ),
            )
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 6. TAX INVOICE ENGINE (FIXED CROSS-AXIS ALIGNMENT)
// ==========================================
class InvoiceScreen extends StatelessWidget {
  const InvoiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          ),
          icon: const Icon(Icons.print, color: Colors.white),
          label: const Text('Print Professional Firm GST Invoice PDF', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
