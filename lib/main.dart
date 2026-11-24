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
// 1. LOCAL SQLITE PERSISTENCE ENGINE (ACID Compliant)
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
    final path = p.join(dbPath, 'neelkanth_enterprise_v7.db');

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
            amount REAL NOT NULL,
            FOREIGN KEY (voucherId) REFERENCES vouchers (id) ON DELETE CASCADE
          )
        ''');
      },
    );
  }

  Future<List>> getFirms() async {
    final db = await database;
    return await db.query('firms');
  }

  Future<void> insertFirm(Map<String, dynamic> row) async {
    final db = await database;
    await db.insert('firms', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List>> getAccounts(String firmId) async {
    final db = await database;
    return await db.query('accounts', where: 'firmId = ?', whereArgs: [firmId]);
  }

  Future<void> insertAccount(Map<String, dynamic> row) async {
    final db = await database;
    await db.insert('accounts', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List>> getStock(String firmId) async {
    final db = await database;
    return await db.query('stock_items', where: 'firmId = ?', whereArgs: [firmId]);
  }

  Future<void> insertStock(Map<String, dynamic> row) async {
    final db = await database;
    await db.insert('stock_items', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List>> getVouchers(String firmId) async {
    final db = await database;
    return await db.query('vouchers', where: 'firmId = ?', whereArgs: [firmId], orderBy: 'date DESC');
  }

  Future<List>> getJournalEntries(String voucherId) async {
    final db = await database;
    return await db.query('journal_entries', where: 'voucherId = ?', whereArgs: [voucherId]);
  }

  // Atomic Double-Entry Transaction Guard
  Future<void> saveVoucherTransaction(Map<String, dynamic> voucher, List> entries) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.insert('vouchers', voucher, conflictAlgorithm: ConflictAlgorithm.replace);
      for (var entry in entries) {
        final accName = (entry['account'] ?? '').toString().trim();
        if (accName.isEmpty) continue;
        final double amt = (entry['amount'] as double?) ?? 0.0;

        await txn.insert('journal_entries', {
          'id': 'j_${DateTime.now().microsecondsSinceEpoch}_$accName',
          'voucherId': voucher['id'],
          'accountName': accName,
          'type': entry['type'],
          'amount': amt,
        });

        // Update account balances based on accounting rules (Asset/Expense Dr +, Liability/Revenue Cr +)
        final double sign = entry['type'] == 'DEBIT' ? 1.0 : -1.0;
        await txn.rawUpdate(
          'UPDATE accounts SET balance = balance + ? WHERE firmId = ? AND name = ?',
          [amt * sign, voucher['firmId'], accName],
        );
      }
    });
  }

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
// CENTRAL STATE MANAGEMENT
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
// 2. FIRM SELECTION SCREEN
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
  List> _firms = [];

  @override
  void initState() {
    super.initState();
    _loadFirms();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _gstinController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _loadFirms() async {
    final data = await LocalDatabase.instance.getFirms();
    if (!mounted) return;
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
              final cleanName = _nameController.text.trim();
              if (cleanName.isNotEmpty) {
                final firmId = 'firm_${DateTime.now().millisecondsSinceEpoch}';
                final newFirm = {
                  'id': firmId,
                  'name': cleanName,
                  'gstin': _gstinController.text.trim(),
                  'address': _addressController.text.trim(),
                };
                await LocalDatabase.instance.insertFirm(newFirm);

                // Default Chart of Accounts
                await LocalDatabase.instance.insertAccount({'id': 'a1_$firmId', 'firmId': firmId, 'name': 'Cash Account', 'category': 'Asset', 'balance': 0.0});
                await LocalDatabase.instance.insertAccount({'id': 'a2_$firmId', 'firmId': firmId, 'name': 'Bank Account', 'category': 'Asset', 'balance': 0.0});
                await LocalDatabase.instance.insertAccount({'id': 'a3_$firmId', 'firmId': firmId, 'name': 'Sales Account', 'category': 'Revenue', 'balance': 0.0});
                await LocalDatabase.
