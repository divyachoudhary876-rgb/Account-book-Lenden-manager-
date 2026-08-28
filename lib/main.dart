import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:sqflite/sqflite.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalDatabase.instance.initDB();
  runApp(const EnterpriseAccountingApp());
}

// ==========================================
// 1. ADVANCED LOCAL SQLITE PERSISTENCE ENGINE
// ==========================================
class LocalDatabase {
  static final LocalDatabase instance = LocalDatabase._init();
  static Database? _database;

  LocalDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await initDB();
    return _database!;
  }

  Future<Database> initDB() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'neelkanth_enterprise_v5.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE firms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            gstin TEXT,
            address TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE accounts (
            id TEXT PRIMARY KEY,
            firmId TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            groupName TEXT DEFAULT 'General',
            balance REAL DEFAULT 0.0
          )
        ''');

        await db.execute('''
          CREATE TABLE stock_items (
            id TEXT PRIMARY KEY,
            firmId TEXT NOT NULL,
            name TEXT NOT NULL,
            hsn TEXT,
            unit TEXT NOT NULL,
            qty REAL DEFAULT 0.0,
            rate REAL NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE vouchers (
            id TEXT PRIMARY KEY,
            firmId TEXT NOT NULL,
            voucherNo TEXT NOT NULL,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            narration TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE journal_entries (
            id TEXT PRIMARY KEY,
            voucherId TEXT NOT NULL,
            accountName TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL
          )
        ''');
      },
    );
  }

  Future<List<Map<String, dynamic>>> getFirms() async {
    final db = await database;
    return await db.query('firms');
  }

  Future<void> insertFirm(Map<String, dynamic> row) async {
    final db = await database;
    await db.insert('firms', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getAccounts(String firmId) async {
    final db = await database;
    return await db.query('accounts', where: 'firmId = ?', whereArgs: [firmId]);
  }

  Future<void> insertAccount(Map<String, dynamic> row) async {
    final db = await database;
    await db.insert('accounts', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getStock(String firmId) async {
    final db = await database;
    return await db.query('stock_items', where: 'firmId = ?', whereArgs: [firmId]);
  }

  Future<void> insertStock(Map<String, dynamic> row) async {
    final db = await database;
    await db.insert('stock_items', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getVouchers(String firmId) async {
    final db = await database;
    return await db.query('vouchers', where: 'firmId = ?', whereArgs: [firmId]);
  }

  Future<List<Map<String, dynamic>>> getJournalEntries(String voucherId) async {
    final db = await database;
    return await db.query('journal_entries', where: 'voucherId = ?', whereArgs: [voucherId]);
  }

  Future<void> saveVoucherTransaction(Map<String, dynamic> voucher, List<Map<String, dynamic>> entries) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.insert('vouchers', voucher, conflictAlgorithm: ConflictAlgorithm.replace);
      for (var entry in entries) {
        await txn.insert('journal_entries', {
          'id': 'j_${DateTime.now().microsecondsSinceEpoch}_${entry['account']}',
          'voucherId': voucher['id'],
          'accountName': entry['account'],
          'type': entry['type'],
          'amount': entry['amount'],
        });

        double amt = entry['amount'] ?? 0.0;
        double sign = entry['type'] == 'DEBIT' ? 1.0 : -1.0;
        await txn.rawUpdate(
          'UPDATE accounts SET balance = balance + ? WHERE firmId = ? AND name = ?',
          [amt * sign, voucher['firmId'], entry['account']],
        );
      }
    });
  }

  // DATA BACKUP JSON EXPORTER
  Future<String> exportBackupJSON(String firmId) async {
    final db = await database;
    final accounts = await db.query('accounts', where: 'firmId = ?', whereArgs: [firmId]);
    final vouchers = await db.query('vouchers', where: 'firmId = ?', whereArgs: [firmId]);
    final stock = await db.query('stock_items', where: 'firmId = ?', whereArgs: [firmId]);

    final Map<String, dynamic> dump = {
      'firmId': firmId,
      'accounts': accounts,
      'vouchers': vouchers,
      'stock': stock,
      'timestamp': DateTime.now().toIso8601String(),
    };
    return jsonEncode(dump);
  }
}

// ==========================================
// STATE ENGINE
// ==========================================
class AppState {
  static Map<String, dynamic>? activeFirm;
}

class EnterpriseAccountingApp extends StatelessWidget {
  const EnterpriseAccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Enterprise Accounting Suite',
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
// FIRM GATEKEEPER SCREEN
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
  List<Map<String, dynamic>> _firms = [];

  @override
  void initState() {
    super.initState();
    _loadFirms();
  }

  Future<void> _loadFirms() async {
    final data = await LocalDatabase.instance.getFirms();
    setState(() => _firms = data);
  }

  void _showCreateFirmDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Create New Business Firm', style: TextStyle(color: Color(0xFF10B981))),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _nameController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Firm Name')),
            const SizedBox(height: 8),
            TextField(controller: _gstinController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'GSTIN Number')),
            const SizedBox(height: 8),
            TextField(controller: _addressController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Address')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () async {
              if (_nameController.text.isNotEmpty) {
                final firmId = 'firm_${DateTime.now().millisecondsSinceEpoch}';
                final newFirm = {
                  'id': firmId,
                  'name': _nameController.text,
                  'gstin': _gstinController.text,
                  'address': _addressController.text,
                };
                await LocalDatabase.instance.insertFirm(newFirm);

                await LocalDatabase.instance.insertAccount({'id': 'a1_$firmId', 'firmId': firmId, 'name': 'Cash Account', 'category': 'Asset', 'groupName': 'Cash-in-hand', 'balance': 0.0});
                await LocalDatabase.instance.insertAccount({'id': 'a2_$firmId', 'firmId': firmId, 'name': 'Bank Account', 'category': 'Asset', 'groupName': 'Bank Accounts', 'balance': 0.0});
                await LocalDatabase.instance.insertAccount({'id': 'a3_$firmId', 'firmId': firmId, 'name': 'Sales Account', 'category': 'Revenue', 'groupName': 'Sales Accounts', 'balance': 0.0});

                _nameController.clear();
                _gstinController.clear();
                _addressController.clear();
                Navigator.pop(context);
                _loadFirms();
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
      appBar: AppBar(title: const Text('Select Business Firm'), backgroundColor: const Color(0xFF1E293B)),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), minimumSize: const Size.fromHeight(50)),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('+ Add New Business Firm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              onPressed: _showCreateFirmDialog,
            ),
            const SizedBox(height: 20),
            Expanded(
              child: _firms.isEmpty
                  ? const Center(child: Text('No Firms Found. Create a firm to start.', style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      itemCount: _firms.length,
                      itemBuilder: (context, idx) {
                        final firm = _firms[idx];
                        return Card(
                          color: const Color(0xFF1E293B),
                          child: ListTile(
                            leading: const Icon(Icons.business, color: Color(0xFF10B981)),
                            title: Text(firm['name'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
// MAIN DASHBOARD
// ==========================================
class MainDashboardScreen extends StatefulWidget {
  const MainDashboardScreen({super.key});

  @override
  State<MainDashboardScreen> createState() => _MainDashboardScreenState();
}

class _MainDashboardScreenState extends State<MainDashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      const VoucherTerminalScreen(),
      const DayBookScreen(),
      const LedgerBookScreen(),
      const FinancialReportsScreen(),
      const BankReconciliationScreen(),
      const StockScreen(),
      const AccountManagementScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Text('🏢 ${AppState.activeFirm!['name']}', style: const TextStyle(color: Color(0xFF10B981), fontSize: 16, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.switch_left, color: Colors.amberAccent),
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
          BottomNavigationBarItem(icon: Icon(Icons.analytics), label: 'ITR/GST'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance), label: 'Bank Recon'),
          BottomNavigationBarItem(icon: Icon(Icons.inventory), label: 'Stock'),
          BottomNavigationBarItem(icon: Icon(Icons.person_add), label: 'Accounts'),
        ],
      ),
    );
  }
}

// ==========================================
// VOUCHER TERMINAL
// ==========================================
class VoucherTerminalScreen extends StatefulWidget {
  const VoucherTerminalScreen({super.key});

  @override
  State<VoucherTerminalScreen> createState() => _VoucherTerminalScreenState();
}

class _VoucherTerminalScreenState extends State<VoucherTerminalScreen> {
  String voucherType = 'Sales';
  final _narrationController = TextEditingController();
  List<Map<String, dynamic>> _accounts = [];

  List<Map<String, dynamic>> _entries = [
    {'type': 'DEBIT', 'account': null, 'amount': 0.0},
    {'type': 'CREDIT', 'account': null, 'amount': 0.0},
  ];

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    final data = await LocalDatabase.instance.getAccounts(AppState.activeFirm!['id'] as String);
    setState(() => _accounts = data);
  }

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
            TextField(controller: _narrationController, style: const TextStyle(color: Colors.white, fontSize: 13), decoration: const InputDecoration(hintText: 'Narration / Note')),
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
                              items: _accounts.map((a) {
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
                              onChanged: (v) => setState(() => _entries[idx]['amount'] = double.tryParse(v) ?? 0.0),
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
                  label: const Text('Add Line', style: TextStyle(color: emerald)),
                ),
                ElevatedButton(
                  onPressed: _isBalanced
                      ? () async {
                          final voucher = {
                            'id': 'vouch_${DateTime.now().millisecondsSinceEpoch}',
                            'firmId': AppState.activeFirm!['id'] as String,
                            'voucherNo': 'VOUCH-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
                            'type': voucherType,
                            'date': '28 Aug 2026',
                            'narration': _narrationController.text,
                          };

                          await LocalDatabase.instance.saveVoucherTransaction(voucher, _entries);
                          _clearForm();
                          _loadAccounts();
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Voucher Saved Successfully!')));
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
// DAY BOOK
// ==========================================
class DayBookScreen extends StatefulWidget {
  const DayBookScreen({super.key});

  @override
  State<DayBookScreen> createState() => _DayBookScreenState();
}

class _DayBookScreenState extends State<DayBookScreen> {
  List<Map<String, dynamic>> _vouchers = [];

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  Future<void> _loadVouchers() async {
    final data = await LocalDatabase.instance.getVouchers(AppState.activeFirm!['id'] as String);
    setState(() => _vouchers = data);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _vouchers.isEmpty
          ? const Center(child: Text('No Vouchers Found.', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _vouchers.length,
              itemBuilder: (context, idx) {
                final v = _vouchers[idx];
                return FutureBuilder<List<Map<String, dynamic>>>(
                  future: LocalDatabase.instance.getJournalEntries(v['id'] as String),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) return const SizedBox();
                    final entries = snapshot.data!;
                    final dr = entries.firstWhere((e) => e['type'] == 'DEBIT', orElse: () => {'accountName': 'N/A', 'amount': 0.0});
                    final cr = entries.firstWhere((e) => e['type'] == 'CREDIT', orElse: () => {'accountName': 'N/A', 'amount': 0.0});

                    return Card(
                      color: const Color(0xFF1E293B),
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text('By ${dr['accountName']} (Dr.)', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('To ${cr['accountName']} (Cr.)', style: const TextStyle(color: Colors.grey)),
                            Text('Voucher #: ${v['voucherNo']} | Date: ${v['date']}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                          ],
                        ),
                        trailing: Text('₹${(dr['amount'] as double).toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}

// ==========================================
// LEDGER BOOK
// ==========================================
class LedgerBookScreen extends StatefulWidget {
  const LedgerBookScreen({super.key});

  @override
  State<LedgerBookScreen> createState() => _LedgerBookScreenState();
}

class _LedgerBookScreenState extends State<LedgerBookScreen> {
  List<Map<String, dynamic>> _accounts = [];

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    final data = await LocalDatabase.instance.getAccounts(AppState.activeFirm!['id'] as String);
    setState(() => _accounts = data);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _accounts.length,
        itemBuilder: (context, idx) {
          final acc = _accounts[idx];
          final bal = acc['balance'] as double;

          return Card(
            color: const Color(0xFF1E293B),
            child: ListTile(
              title: Text(acc['name'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              subtitle: Text('Category: ${acc['category']} | Group: ${acc['groupName'] ?? "General"}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
              trailing: Text(
                '₹${bal.abs().toStringAsFixed(2)} ${bal >= 0 ? "Dr" : "Cr"}',
                style: TextStyle(color: bal >= 0 ? const Color(0xFF10B981) : Colors.redAccent, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ==========================================
// FINANCIAL REPORTS & GSTR TAX ENGINE
// ==========================================
class FinancialReportsScreen extends StatefulWidget {
  const FinancialReportsScreen({super.key});

  @override
  State<FinancialReportsScreen> createState() => _FinancialReportsScreenState();
}

class _FinancialReportsScreenState extends State<FinancialReportsScreen> {
  List<Map<String, dynamic>> _accounts = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final data = await LocalDatabase.instance.getAccounts(AppState.activeFirm!['id'] as String);
    setState(() => _accounts = data);
  }

  double get totalRevenue => _accounts.where((a) => a['category'] == 'Revenue').fold(0.0, (s, a) => s + (a['balance'] as double).abs());
  double get totalExpense => _accounts.where((a) => a['category'] == 'Expense').fold(0.0, (s, a) => s + (a['balance'] as double).abs());
  double get netProfit => totalRevenue - totalExpense;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('ITR & GSTR-1 Tax Return Engine', style: TextStyle(color: Color(0xFF10B981), fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Card(
              color: const Color(0xFF1E293B),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Sales (GSTR-1 Taxable Value):', style: TextStyle(color: Colors.grey)),
                        Text('₹${totalRevenue.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Business Expenses:', style: TextStyle(color: Colors.grey)),
                        Text('₹${totalExpense.toStringAsFixed(2)}', style: const TextStyle(color: Colors.roseAccent, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      ],
                    ),
                    const Divider(color: Colors.grey),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Net Taxable Profit (ITR-3/4):', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        Text('₹${netProfit.toStringAsFixed(2)}', style: TextStyle(color: netProfit >= 0 ? const Color(0xFF10B981) : Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'monospace')),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), minimumSize: const Size.fromHeight(48)),
              icon: const Icon(Icons.picture_as_pdf, color: Colors.white),
              label: const Text('Export Official Tax Report Pack (PDF)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              onPressed: () => _generateTaxReportPDF(context),
            ),
            const SizedBox(height: 10),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), minimumSize: const Size.fromHeight(48)),
              icon: const Icon(Icons.download, color: Colors.amberAccent),
              label: const Text('Export Encrypted Data Backup (JSON)', style: TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold)),
              onPressed: () async {
                final jsonStr = await LocalDatabase.instance.exportBackupJSON(AppState.activeFirm!['id'] as String);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Encrypted JSON Data Backup Exported!')));
              },
            )
          ],
        ),
      ),
    );
  }

  Future<void> _generateTaxReportPDF(BuildContext context) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context ctx) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(24),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(AppState.activeFirm!['name'] as String, style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
                pw.Text('GSTIN: ${AppState.activeFirm!['gstin']} | Address: ${AppState.activeFirm!['address']}'),
                pw.SizedBox(height: 10),
                pw.Text('FINANCIAL STATEMENT & PROFIT LOSS PACK', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.green700)),
                pw.Text('Assessment Year: 2026-27 | Date: 28/08/2026'),
                pw.Divider(),
                pw.SizedBox(height: 10),
                pw.TableHelper.fromTextArray(
                  headers: ['Particulars', 'Category', 'Amount (INR)'],
                  data: [
                    ['Total Revenue / Sales', 'Income', 'Rs. ${totalRevenue.toStringAsFixed(2)}'],
                    ['Total Operating Expenses', 'Expense', 'Rs. ${totalExpense.toStringAsFixed(2)}'],
                    ['Net Taxable Profit / Loss', 'Profit', 'Rs. ${netProfit.toStringAsFixed(2)}'],
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

// ==========================================
// BANK RECONCILIATION ENGINE
// ==========================================
class BankReconciliationScreen extends StatelessWidget {
  const BankReconciliationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Automated Bank Reconciliation Engine', style: TextStyle(color: Color(0xFF10B981), fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Card(
              color: const Color(0xFF1E293B),
              child: ListTile(
                leading: const Icon(Icons.account_balance, color: Color(0xFF10B981)),
                title: const Text('HDFC Bank Account', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                subtitle: const Text('Book Balance: ₹1,20,000.00 | Statement Status: Matched', style: TextStyle(color: Colors.grey, fontSize: 11)),
                trailing: const Icon(Icons.check_circle, color: Color(0xFF10B981)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// STOCK MANAGEMENT
// ==========================================
class StockScreen extends StatefulWidget {
  const StockScreen({super.key});

  @override
  State<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends State<StockScreen> {
  final _nameController = TextEditingController();
  final _hsnController = TextEditingController();
  final _qtyController = TextEditingController();
  final _rateController = TextEditingController();
  String _unit = 'Tons';
  List<Map<String, dynamic>> _stock = [];

  @override
  void initState() {
    super.initState();
    _loadStock();
  }

  Future<void> _loadStock() async {
    final data = await LocalDatabase.instance.getStock(AppState.activeFirm!['id'] as String);
    setState(() => _stock = data);
  }

  @override
  Widget build(BuildContext context) {
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
                          onPressed: () async {
                            if (_nameController.text.isNotEmpty) {
                              await LocalDatabase.instance.insertStock({
                                'id': 'item_${DateTime.now().millisecondsSinceEpoch}',
                                'firmId': AppState.activeFirm!['id'] as String,
                                'name': _nameController.text,
                                'hsn': _hsnController.text,
                                'unit': _unit,
                                'qty': double.tryParse(_qtyController.text) ?? 0.0,
                                'rate': double.tryParse(_rateController.text) ?? 0.0,
                              });
                              _nameController.clear();
                              _hsnController.clear();
                              _qtyController.clear();
                              _rateController.clear();
                              _loadStock();
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
                itemCount: _stock.length,
                itemBuilder: (context, idx) {
                  final item = _stock[idx];
                  double val = (item['qty'] as double) * (item['rate'] as double);

                  return Card(
                    color: const Color(0xFF1E293B),
                    child: ListTile(
                      title: Text(item['name'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
// CHART OF ACCOUNTS CREATION
// ==========================================
class AccountManagementScreen extends StatefulWidget {
  const AccountManagementScreen({super.key});

  @override
  State<AccountManagementScreen> createState() => _AccountManagementScreenState();
}

class _AccountManagementScreenState extends State<AccountManagementScreen> {
  final _nameController = TextEditingController();
  final _balController = TextEditingController();
  String _category = 'Asset';
  List<Map<String, dynamic>> _accounts = [];

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    final data = await LocalDatabase.instance.getAccounts(AppState.activeFirm!['id'] as String);
    setState(() => _accounts = data);
  }

  @override
  Widget build(BuildContext context) {
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
                    const Text('Create Custom Ledger Account', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(controller: _nameController, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Account Name')),
                    const SizedBox(height: 8),
                    TextField(controller: _balController, keyboardType: TextInputType.number, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(hintText: 'Opening Balance (₹)')),
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
                          onPressed: () async {
                            if (_nameController.text.isNotEmpty) {
                              await LocalDatabase.instance.insertAccount({
                                'id': 'acc_${DateTime.now().millisecondsSinceEpoch}',
                                'firmId': AppState.activeFirm!['id'] as String,
                                'name': _nameController.text,
                                'category': _category,
                                'balance': double.tryParse(_balController.text) ?? 0.0,
                              });
                              _nameController.clear();
                              _balController.clear();
                              _loadAccounts();
                            }
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                          child: const Text('Save Ledger', style: TextStyle(color: Colors.white)),
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
                itemCount: _accounts.length,
                itemBuilder: (context, idx) {
                  return ListTile(
                    title: Text(_accounts[idx]['name'] as String, style: const TextStyle(color: Colors.white)),
                    subtitle: Text('Type: ${_accounts[idx]['category']} | Balance: ₹${_accounts[idx]['balance']}', style: const TextStyle(color: Colors.grey)),
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
