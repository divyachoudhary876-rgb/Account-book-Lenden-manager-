import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

void main() {
  runApp(const EnterpriseAccountingApp());
}

class EnterpriseAccountingApp extends StatelessWidget {
  const EnterpriseAccountingApp({super.key});

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
      home: const FirmSelectionScreen(),
    );
  }
}

// ==========================================
// CENTRAL ENTERPRISE DATA & STATE ENGINE
// ==========================================
class AppState {
  static Map<String, String>? activeFirm;
  static List<Map<String, String>> firms = [];
  static List<Map<String, dynamic>> accounts = [];
  static List<Map<String, dynamic>> stockItems = [];
  static List<Map<String, dynamic>> vouchers = [];

  static void createFirm(String name, String gstin, String address) {
    final newFirm = {
      'id': 'firm_${DateTime.now().millisecondsSinceEpoch}',
      'name': name,
      'gstin': gstin,
      'address': address,
    };
    firms.add(newFirm);
    activeFirm = newFirm;
    
    // Default system accounts per firm
    addAccount('Cash Account', 'Asset', 0.0);
    addAccount('Bank Account', 'Asset', 0.0);
    addAccount('Sales Account', 'Revenue', 0.0);
    addAccount('Purchase Account', 'Expense', 0.0);
  }

  static List<Map<String, dynamic>> getActiveAccounts() {
    if (activeFirm == null) return [];
    return accounts.where((a) => a['firmId'] == activeFirm!['id']).toList();
  }

  static List<Map<String, dynamic>> getActiveStock() {
    if (activeFirm == null) return [];
    return stockItems.where((i) => i['firmId'] == activeFirm!['id']).toList();
  }

  static List<Map<String, dynamic>> getActiveVouchers() {
    if (activeFirm == null) return [];
    return vouchers.where((v) => v['firmId'] == activeFirm!['id']).toList();
  }

  static void addAccount(String name, String category, double openingBalance) {
    accounts.add({
      'id': 'acc_${DateTime.now().millisecondsSinceEpoch}',
      'firmId': activeFirm!['id'],
      'name': name,
      'category': category,
      'balance': openingBalance,
      'transactions': <Map<String, dynamic>>[],
    });
  }

  static void addStockItem(String name, String hsn, String unit, double qty, double rate) {
    stockItems.add({
      'id': 'item_${DateTime.now().millisecondsSinceEpoch}',
      'firmId': activeFirm!['id'],
      'name': name,
      'hsn': hsn,
      'unit': unit,
      'qty': qty,
      'rate': rate,
    });
  }

  static void postVoucher({
    required String type,
    required String voucherNo,
    required String date,
    required String narration,
    required List<Map<String, dynamic>> entries,
  }) {
    final voucherRecord = {
      'id': 'vouch_${DateTime.now().millisecondsSinceEpoch}',
      'firmId': activeFirm!['id'],
      'voucherNo': voucherNo,
      'type': type,
      'date': date,
      'narration': narration,
      'entries': entries,
    };
    
    vouchers.add(voucherRecord);

    // Double-Entry Ledger Posting
    for (var entry in entries) {
      final acc = accounts.firstWhere((a) => a['name'] == entry['account'], orElse: () => {});
      if (acc.isNotEmpty) {
        double amt = entry['amount'] ?? 0.0;
        if (entry['type'] == 'DEBIT') {
          acc['balance'] = (acc['balance'] as double) + amt;
        } else {
          acc['balance'] = (acc['balance'] as double) - amt;
        }
        (acc['transactions'] as List).add({
          'voucherNo': voucherNo,
          'date': date,
          'particulars': entry['type'] == 'DEBIT' ? 'By ${entry['account']}' : 'To ${entry['account']}',
          'type': entry['type'],
          'amount': amt,
          'runningBalance': acc['balance'],
        });
      }
    }
  }

  static void updateVoucher(String voucherId, List<Map<String, dynamic>> newEntries) {
    int idx = vouchers.indexWhere((v) => v['id'] == voucherId);
    if (idx != -1) {
      vouchers[idx]['entries'] = newEntries;
    }
  }
}

// ==========================================
// 1. FIRM SELECTION & CREATION SCREEN
// ==========================================
class FirmSelectionScreen extends StatefulWidget {
  const FirmSelectionScreen({super.key});

  @override
  State<FirmSelectionScreen> createState() => _FirmSelectionScreenState();
}

class _FirmSelectionScreenState extends State<FirmSelectionScreen> {
  final _nameController = TextEditingController();
  final _gstinController = TextEditingController();
  final _addressController = TextEditingController();

  void _showCreateFirmDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Create New Business Firm', style: TextStyle(color: Color(0xFF10B981))),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _nameController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Firm / Business Name')),
            const SizedBox(height: 8),
            TextField(controller: _gstinController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'GSTIN Number')),
            const SizedBox(height: 8),
            TextField(controller: _addressController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Address & Location')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () {
              if (_nameController.text.isNotEmpty) {
                AppState.createFirm(_nameController.text, _gstinController.text, _addressController.text);
                _nameController.clear();
                _gstinController.clear();
                _addressController.clear();
                Navigator.pop(context);
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const MainDashboardScreen()));
              }
            },
            child: const Text('Create Firm', style: TextStyle(color: Colors.white)),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Select Working Firm / Company'), backgroundColor: const Color(0xFF1E293B)),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                minimumSize: const Size.fromHeight(50),
              ),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('+ Add New Business Firm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              onPressed: _showCreateFirmDialog,
            ),
            const SizedBox(height: 20),
            Expanded(
              child: AppState.firms.isEmpty
                  ? const Center(child: Text('No Firms Created. Please create a firm to start accounting.', style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      itemCount: AppState.firms.length,
                      itemBuilder: (context, idx) {
                        final firm = AppState.firms[idx];
                        return Card(
                          color: const Color(0xFF1E293B),
                          child: ListTile(
                            leading: const Icon(Icons.business, color: Color(0xFF10B981)),
                            title: Text(firm['name']!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            subtitle: Text('GSTIN: ${firm['gstin']} | ${firm['address']}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                            trailing: const Icon(Icons.arrow_forward_ios, color: Colors.grey, size: 16),
                            onTap: () {
                              AppState.activeFirm = firm;
                              Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const MainDashboardScreen()));
                            },
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
// MAIN DASHBOARD & NAVIGATION
// ==========================================
class MainDashboardScreen extends StatefulWidget {
  const MainDashboardScreen({super.key});

  @override
  State<MainDashboardScreen> createState() => _MainDashboardScreenState();
}

class _MainDashboardScreenState extends State<MainDashboardScreen> {
  int _currentIndex = 0;

  void _refresh() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      ProfessionalVoucherTerminal(onUpdate: _refresh),
      const ProfessionalDayBookScreen(),
      const ProfessionalLedgerScreen(),
      StockInventoryScreen(onUpdate: _refresh),
      AccountManagementScreen(onUpdate: _refresh),
      const InvoiceBillingScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Text('🏢 ${AppState.activeFirm!['name']}', style: const TextStyle(color: Color(0xFF10B981), fontSize: 16, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.switch_left, color: Colors.amberAccent),
            tooltip: 'Switch Firm',
            onPressed: () {
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const FirmSelectionScreen()));
            },
          )
        ],
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
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
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: 'Billing'),
        ],
      ),
    );
  }
}

// ==========================================
// 2. PROFESSIONAL VOUCHER TERMINAL (AUTO-RESET)
// ==========================================
class ProfessionalVoucherTerminal extends StatefulWidget {
  final VoidCallback onUpdate;
  const ProfessionalVoucherTerminal({super.key, required this.onUpdate});

  @override
  State<ProfessionalVoucherTerminal> createState() => _ProfessionalVoucherTerminalState();
}

class _ProfessionalVoucherTerminalState extends State<ProfessionalVoucherTerminal> {
  String voucherType = 'Sales';
  final _narrationController = TextEditingController();
  
  List<Map<String, dynamic>> _entries = [
    {'type': 'DEBIT', 'account': null, 'amount': 0.0},
    {'type': 'CREDIT', 'account': null, 'amount': 0.0},
  ];

  void _clearForm() {
    setState(() {
      _narrationController.clear();
      _entries = [
        {'type': 'DEBIT', 'account': null, 'amount': 0.0},
        {'type': 'CREDIT', 'account': null, 'amount': 0.0},
      ];
    });
  }

  double get _totalDebit => _entries.where((e) => e['type'] == 'DEBIT').fold(0.0, (s, e) => s + (e['amount'] ?? 0.0));
  double get _totalCredit => _entries.where((e) => e['type'] == 'CREDIT').fold(0.0, (s, e) => s + (e['amount'] ?? 0.0));
  bool get _isBalanced => (_totalDebit - _totalCredit).abs() < 0.001 && _totalDebit > 0;

  @override
  Widget build(BuildContext context) {
    const Color emerald = Color(0xFF10B981);
    final accounts = AppState.getActiveAccounts();

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['Sales', 'Purchase', 'Payment', 'Receipt', 'Journal'].map((t) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(t),
                      selected: voucherType == t,
                      selectedColor: emerald,
                      onSelected: (v) => setState(() => voucherType = t),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _isBalanced ? emerald.withOpacity(0.15) : Colors.amber.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _isBalanced ? emerald : Colors.amber),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_isBalanced ? '✓ Double-Entry Balanced' : '⚠ Diff: ₹${(_totalDebit - _totalCredit).abs().toStringAsFixed(2)}',
                      style: TextStyle(color: _isBalanced ? emerald : Colors.amberAccent, fontWeight: FontWeight.bold)),
                  Text('Dr: ₹${_totalDebit.toStringAsFixed(2)} | Cr: ₹${_totalCredit.toStringAsFixed(2)}', style: const TextStyle(fontFamily: 'monospace')),
                ],
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _narrationController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: const InputDecoration(hintText: 'Enter Narration / Note'),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ListView.builder(
                itemCount: _entries.length,
                itemBuilder: (context, idx) {
                  return Card(
                    color: const Color(0xFF1E293B),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Row(
                        children: [
                          DropdownButton<String>(
                            value: _entries[idx]['type'],
                            dropdownColor: const Color(0xFF0F172A),
                            items: const [
                              DropdownMenuItem(value: 'DEBIT', child: Text('By (Dr.)')),
                              DropdownMenuItem(value: 'CREDIT', child: Text('To (Cr.)')),
                            ],
                            onChanged: (v) => setState(() => _entries[idx]['type'] = v),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _entries[idx]['account'],
                              dropdownColor: const Color(0xFF0F172A),
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              decoration: const InputDecoration(hintText: 'Select Account'),
                              items: accounts.map((a) {
                                return DropdownMenuItem<String>(
                                  value: a['name'] as String,
                                  child: Text(a['name'] as String),
                                );
                              }).toList(),
                              onChanged: (v) => setState(() => _entries[idx]['account'] = v),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            width: 80,
                            child: TextField(
                              keyboardType: TextInputType.number,
                              style: const TextStyle(color: Colors.white),
                              decoration: const InputDecoration(hintText: '0.00'),
                              onChanged: (v) {
                                setState(() {
                                  _entries[idx]['amount'] = double.tryParse(v) ?? 0.0;
                                });
                              },
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
                  onPressed: () => setState(() => _entries.add({'type': 'DEBIT', 'account': null, 'amount': 0.0})),
                  icon: const Icon(Icons.add, color: emerald),
                  label: const Text('Add Row', style: TextStyle(color: emerald)),
                ),
                ElevatedButton(
                  onPressed: _isBalanced
                      ? () {
                          AppState.postVoucher(
                            type: voucherType,
                            voucherNo: 'VOUCH-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
                            date: '28 Aug 2026',
                            narration: _narrationController.text,
                            entries: _entries,
                          );
                          _clearForm();
                          widget.onUpdate();
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Voucher Posted! Entry Box Reset.')));
                        }
                      : null,
                  style: ElevatedButton.styleFrom(backgroundColor: emerald),
                  child: const Text('Post Voucher', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                )
              ],
            )
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 3. DAY BOOK WITH EDITABLE VOUCHERS
// ==========================================
class ProfessionalDayBookScreen extends StatelessWidget {
  const ProfessionalDayBookScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final vouchers = AppState.getActiveVouchers();

    return Scaffold(
      body: vouchers.isEmpty
          ? const Center(child: Text('No Vouchers Posted Yet.', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: vouchers.length,
              itemBuilder: (context, idx) {
                final v = vouchers[idx];
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
                        if ((v['narration'] as String).isNotEmpty) Text('Note: ${v['narration']}', style: const TextStyle(color: Colors.amberAccent, fontSize: 10)),
                      ],
                    ),
                    trailing: Text('₹${(dr['amount'] as double).toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                  ),
                );
              },
            ),
    );
  }
}

// ==========================================
// 4. LEDGER SCREEN WITH DRILL-DOWN DETAILS
// ==========================================
class ProfessionalLedgerScreen extends StatelessWidget {
  const ProfessionalLedgerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = AppState.getActiveAccounts();

    return Scaffold(
      body: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: accounts.length,
        itemBuilder: (context, idx) {
          final acc = accounts[idx];
          final bal = acc['balance'] as double;
          final txs = acc['transactions'] as List;

          return Card(
            color: const Color(0xFF1E293B),
            child: ExpansionTile(
              title: Text(acc['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              subtitle: Text('Category: ${acc['category']}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
              trailing: Text(
                '₹${bal.abs().toStringAsFixed(2)} ${bal >= 0 ? "Dr" : "Cr"}',
                style: TextStyle(color: bal >= 0 ? const Color(0xFF10B981) : Colors.redAccent, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
              ),
              children: [
                if (txs.isEmpty)
                  const Padding(padding: EdgeInsets.all(8.0), child: Text('No Transactions in this Ledger.', style: TextStyle(color: Colors.grey, fontSize: 11)))
                else
                  ...txs.map((tx) => ListTile(
                        dense: true,
                        title: Text(tx['particulars'], style: const TextStyle(color: Colors.white)),
                        subtitle: Text('Voucher: ${tx['voucherNo']} | Date: ${tx['date']}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                        trailing: Text('₹${(tx['amount'] as double).toStringAsFixed(2)} ${tx['type'] == "DEBIT" ? "Dr" : "Cr"}', style: const TextStyle(color: Colors.amberAccent, fontFamily: 'monospace')),
                      ))
              ],
            ),
          );
        },
      ),
    );
  }
}

// ==========================================
// 5. USER-DEFINED STOCK INVENTORY
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
    final stock = AppState.getActiveStock();

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
                    const Text('Add Custom Stock Item', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(controller: _nameController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Item Name')),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _hsnController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'HSN'))),
                        const SizedBox(width: 8),
                        Expanded(child: TextField(controller: _qtyController, keyboardType: TextInputType.number, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Qty'))),
                        const SizedBox(width: 8),
                        Expanded(child: TextField(controller: _rateController, keyboardType: TextInputType.number, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Rate'))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        DropdownButton<String>(
                          value: _unit,
                          dropdownColor: const Color(0xFF0F172A),
                          items: ['Tons', 'Thousands', 'Kg', 'Bags', 'Pcs'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                          onChanged: (v) => setState(() => _unit = v!),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            if (_nameController.text.isNotEmpty) {
                              AppState.addStockItem(_nameController.text, _hsnController.text, _unit, double.tryParse(_qtyController.text) ?? 0.0, double.tryParse(_rateController.text) ?? 0.0);
                              _nameController.clear();
                              _hsnController.clear();
                              _qtyController.clear();
                              _rateController.clear();
                              widget.onUpdate();
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Item Created!')));
                            }
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                          child: const Text('Save Stock', style: TextStyle(color: Colors.white)),
                        )
                      ],
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ListView.builder(
                itemCount: stock.length,
                itemBuilder: (context, idx) {
                  final item = stock[idx];
                  double val = (item['qty'] as double) * (item['rate'] as double);
                  return Card(
                    color: const Color(0xFF1E293B),
                    child: ListTile(
                      title: Text(item['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      subtitle: Text('HSN: ${item['hsn']} | ${item['qty']} ${item['unit']} @ ₹${item['rate']}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                      trailing: Text('₹${val.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontFamily: 'monospace')),
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
// 6. CHART OF ACCOUNTS CREATION
// ==========================================
class AccountManagementScreen extends StatefulWidget {
  final VoidCallback onUpdate;
  const AccountManagementScreen({super.key, required this.onUpdate});

  @override
  State<AccountManagementScreen> createState() => _AccountManagementScreenState();
}

class _AccountManagementScreenState extends State<AccountManagementScreen> {
  final _nameController = TextEditingController();
  final _balanceController = TextEditingController();
  String _category = 'Asset';

  @override
  Widget build(BuildContext context) {
    final accounts = AppState.getActiveAccounts();

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
                    const Text('Create New Account / Party Ledger', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(controller: _nameController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Account Name (e.g. Sharma Traders)')),
                    const SizedBox(height: 8),
                    TextField(controller: _balanceController, keyboardType: TextInputType.number, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Opening Balance (₹)')),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Text('Type: ', style: TextStyle(color: Colors.grey)),
                        DropdownButton<String>(
                          value: _category,
                          dropdownColor: const Color(0xFF0F172A),
                          items: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                          onChanged: (v) => setState(() => _category = v!),
                        ),
                        const Spacer(),
                        ElevatedButton(
                          onPressed: () {
                            if (_nameController.text.isNotEmpty) {
                              AppState.addAccount(_nameController.text, _category, double.tryParse(_balanceController.text) ?? 0.0);
                              _nameController.clear();
                              _balanceController.clear();
                              widget.onUpdate();
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ledger Created!')));
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
            const SizedBox(height: 10),
            Expanded(
              child: ListView.builder(
                itemCount: accounts.length,
                itemBuilder: (context, idx) {
                  return ListTile(
                    title: Text(accounts[idx]['name'], style: const TextStyle(color: Colors.white)),
                    subtitle: Text('Type: ${accounts[idx]['category']} | Balance: ₹${accounts[idx]['balance']}', style: const TextStyle(color: Colors.grey)),
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
// 7. INVOICE GENERATION ENGINE
// ==========================================
class InvoiceBillingScreen extends StatelessWidget {
  const InvoiceBillingScreen({super.key});

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
          label: const Text('Print Firm GST Invoice PDF', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
                        pw.Text(AppState.activeFirm!['name']!, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
                        pw.Text('Address: ${AppState.activeFirm!['address']}'),
                        pw.Text('GSTIN: ${AppState.activeFirm!['gstin']}'),
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
                          pw.Text('PARTY DETAILS:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                          pw.Text('Cash / Counter Sale', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
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
                          pw.Text('IFSC: SBIN0001234'),
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
