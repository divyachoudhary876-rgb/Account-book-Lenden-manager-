import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('master_accounting_db');
  runApp(const DoubleEntryAccountingApp());
}

class DoubleEntryAccountingApp extends StatelessWidget {
  const DoubleEntryAccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Professional Accounting Software',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF1B365D),
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B365D)),
      ),
      home: const FirmSelectionScreen(),
    );
  }
}

// ============================================================================
// 1. MULTI-FIRM SELECTION SCREEN
// ============================================================================
class FirmSelectionScreen extends StatefulWidget {
  const FirmSelectionScreen({super.key});

  @override
  State<FirmSelectionScreen> createState() => _FirmSelectionScreenState();
}

class _FirmSelectionScreenState extends State<FirmSelectionScreen> {
  final Box _db = Hive.box('master_accounting_db');

  void _showAddFirmDialog() {
    final nameCtrl = TextEditingController();
    final gstCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create New Firm'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Firm Name *', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: gstCtrl, decoration: const InputDecoration(labelText: 'GSTIN', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                String firmId = 'firm_${DateTime.now().millisecondsSinceEpoch}';
                List firms = _db.get('firms_list', defaultValue: []);
                firms.add({'id': firmId, 'name': nameCtrl.text, 'gst': gstCtrl.text});
                _db.put('firms_list', firms);

                // Initialize Default Chart of Accounts for this firm according to Accounting Rules
                _initializeDefaultAccounts(firmId);

                Navigator.pop(ctx);
                setState(() {});
              }
            },
            child: const Text('Create'),
          )
        ],
      ),
    );
  }

  void _initializeDefaultAccounts(String firmId) {
    List defaultAccounts = [
      {'id': 'acc_cash', 'name': 'Cash-in-Hand', 'type': 'Asset', 'balance': 0.0},
      {'id': 'acc_bank', 'name': 'Bank Account', 'type': 'Asset', 'balance': 0.0},
      {'id': 'acc_sales', 'name': 'Sales Account', 'type': 'Income', 'balance': 0.0},
      {'id': 'acc_purchase', 'name': 'Purchase Account', 'type': 'Expense', 'balance': 0.0},
      {'id': 'acc_capital', 'name': 'Owner Capital', 'type': 'Capital', 'balance': 0.0},
      {'id': 'acc_expenses', 'name': 'General Expenses', 'type': 'Expense', 'balance': 0.0},
    ];
    _db.put('accounts_$firmId', defaultAccounts);
  }

  @override
  Widget build(BuildContext context) {
    List firms = _db.get('firms_list', defaultValue: []);

    return Scaffold(
      appBar: AppBar(backgroundColor: const Color(0xFF1B365D), title: const Text('Select Firm (Accounting)', style: TextStyle(color: Colors.white))),
      body: firms.isEmpty
          ? const Center(child: Text('No firms found. Create one to begin accounting.'))
          : ListView.builder(
              itemCount: firms.length,
              itemBuilder: (ctx, i) {
                var firm = firms[i];
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: ListTile(
                    leading: const CircleAvatar(backgroundColor: Color(0xFF1B365D), child: Icon(Icons.business, color: Colors.white)),
                    title: Text(firm['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('GSTIN: ${firm['gst'].isEmpty ? "N/A" : firm['gst']}'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (ctx) => AccountingDashboard(firmId: firm['id'], firmName: firm['name']))),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF1B365D),
        onPressed: _showAddFirmDialog,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Firm', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}

// ============================================================================
// 2. ACCOUNTING DASHBOARD (Hub for Ledgers, Vouchers, & Billing)
// ============================================================================
class AccountingDashboard extends StatelessWidget {
  final String firmId;
  final String firmName;
  const AccountingDashboard({super.key, required this.firmId, required this.firmName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B365D),
        title: Text(firmName, style: const TextStyle(color: Colors.white)),
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        children: [
          _dashCard(context, 'Chart of Accounts', Icons.account_balance, Colors.blue, () {
            Navigator.push(context, MaterialPageRoute(builder: (ctx) => ChartOfAccountsScreen(firmId: firmId)));
          }),
          _dashCard(context, 'Sales Billing (Auto Ledger)', Icons.receipt_long, Colors.green, () {
            Navigator.push(context, MaterialPageRoute(builder: (ctx) => SalesBillingScreen(firmId: firmId)));
          }),
          _dashCard(context, 'Journal Entry (Dr/Cr)', Icons.book, Colors.orange, () {
            Navigator.push(context, MaterialPageRoute(builder: (ctx) => JournalEntryScreen(firmId: firmId)));
          }),
          _dashCard(context, 'Trial Balance / P&L', Icons.analytics, Colors.purple, () {
            Navigator.push(context, MaterialPageRoute(builder: (ctx) => FinancialReportsScreen(firmId: firmId)));
          }),
        ],
      ),
    );
  }

  Widget _dashCard(BuildContext context, String title, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: color.withOpacity(0.05)),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 40, color: color),
              const SizedBox(height: 12),
              Text(title, textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// 3. CHART OF ACCOUNTS SCREEN
// ============================================================================
class ChartOfAccountsScreen extends StatelessWidget {
  final String firmId;
  const ChartOfAccountsScreen({super.key, required this.firmId});

  @override
  Widget build(BuildContext context) {
    final Box db = Hive.box('master_accounting_db');
    List accounts = db.get('accounts_$firmId', defaultValue: []);

    return Scaffold(
      appBar: AppBar(backgroundColor: const Color(0xFF1B365D), title: const Text('Chart of Accounts', style: TextStyle(color: Colors.white))),
      body: ListView.builder(
        itemCount: accounts.length,
        itemBuilder: (ctx, i) {
          var acc = accounts[i];
          double bal = (acc['balance'] ?? 0.0).toDouble();
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: ListTile(
              title: Text(acc['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Type: ${acc['type']}'),
              trailing: Text('₹ ${bal.abs()} ${bal >= 0 ? "Dr" : "Cr"}', style: TextStyle(fontWeight: FontWeight.bold, color: bal >= 0 ? Colors.green : Colors.red)),
            ),
          );
        },
      ),
    );
  }
}

// ============================================================================
// 4. AUTOMATED SALES BILLING SCREEN (Updates Ledger instantly on Billing)
// ============================================================================
class SalesBillingScreen extends StatefulWidget {
  final String firmId;
  const SalesBillingScreen({super.key, required this.firmId});

  @override
  State<SalesBillingScreen> createState() => _SalesBillingScreenState();
}

class _SalesBillingScreenState extends State<SalesBillingScreen> {
  final Box _db = Hive.box('master_accounting_db');
  final customerCtrl = TextEditingController();
  final amountCtrl = TextEditingController();

  void _postSalesBill() {
    double amt = double.tryParse(amountCtrl.text) ?? 0;
    if (customerCtrl.text.isNotEmpty && amt > 0) {
      List accounts = _db.get('accounts_${widget.firmId}', defaultValue: []);

      // Double Entry Rule for Sales: Cash/Customer Account Dr, Sales Account Cr
      for (var acc in accounts) {
        if (acc['id'] == 'acc_cash') {
          acc['balance'] = (acc['balance'] ?? 0.0) + amt; // Asset Increases (Dr)
        }
        if (acc['id'] == 'acc_sales') {
          acc['balance'] = (acc['balance'] ?? 0.0) - amt; // Income Increases (Cr)
        }
      }
      _db.put('accounts_${widget.firmId}', accounts);

      // Save Invoice Record
      List invoices = _db.get('invoices_${widget.firmId}', defaultValue: []);
      invoices.add({'customer': customerCtrl.text, 'amount': amt, 'date': DateTime.now().toString().substring(0, 10)});
      _db.put('invoices_${widget.firmId}', invoices);

      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    List invoices = _db.get('invoices_${widget.firmId}', defaultValue: []);

    return Scaffold(
      appBar: AppBar(backgroundColor: const Color(0xFF1B365D), title: const Text('Sales Billing (Auto-Ledger)', style: TextStyle(color: Colors.white))),
      body: ListView.builder(
        itemCount: invoices.length,
        itemBuilder: (ctx, i) {
          var inv = invoices[i];
          return Card(
            child: ListTile(
              title: Text(inv['customer'], style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Date: ${inv['date']}'),
              trailing: Text('₹ ${inv['amount']}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF1B365D),
        onPressed: () {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('New Sales Invoice'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(controller: customerCtrl, decoration: const InputDecoration(labelText: 'Customer Name')),
                  const SizedBox(height: 10),
                  TextField(controller: amountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount (₹)')),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(onPressed: _postSalesBill, child: const Text('Generate & Update Ledger')),
              ],
            ),
          );
        },
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Create Bill', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}

// ============================================================================
// 5. JOURNAL ENTRY SCREEN (Manual Dr/Cr Entry Rule Engine)
// ============================================================================
class JournalEntryScreen extends StatefulWidget {
  final String firmId;
  const JournalEntryScreen({super.key, required this.firmId});

  @override
  State<JournalEntryScreen> createState() => _JournalEntryScreenState();
}

class _JournalEntryScreenState extends State<JournalEntryScreen> {
  final Box _db = Hive.box('master_accounting_db');
  String? selectedDrAcc;
  String? selectedCrAcc;
  final amountCtrl = TextEditingController();

  void _postJournalEntry() {
    double amt = double.tryParse(amountCtrl.text) ?? 0;
    if (selectedDrAcc != null && selectedCrAcc != null && amt > 0) {
      List accounts = _db.get('accounts_${widget.firmId}', defaultValue: []);

      for (var acc in accounts) {
        if (acc['name'] == selectedDrAcc) {
          acc['balance'] = (acc['balance'] ?? 0.0) + amt; // Debit
        }
        if (acc['name'] == selectedCrAcc) {
          acc['balance'] = (acc['balance'] ?? 0.0) - amt; // Credit
        }
      }
      _db.put('accounts_${widget.firmId}', accounts);
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    List accounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
    List<String> accNames = accounts.map((e) => e['name'].toString()).toList();

    return Scaffold(
      appBar: AppBar(backgroundColor: const Color(0xFF1B365D), title: const Text('Journal Voucher (Dr / Cr)', style: TextStyle(color: Colors.white))),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Debit Account (Dr.)', border: OutlineInputBorder()),
              items: accNames.map((n) => DropdownMenuItem(value: n, child: Text(n))).toList(),
              onChanged: (v) => setState(() => selectedDrAcc = v),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Credit Account (Cr.)', border: OutlineInputBorder()),
              items: accNames.map((n) => DropdownMenuItem(value: n, child: Text(n))).toList(),
              onChanged: (v) => setState(() => selectedCrAcc = v),
            ),
            const SizedBox(height: 16),
            TextField(controller: amountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount (₹)', border: OutlineInputBorder())),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B365D), foregroundColor: Colors.white, minimumSize: const Size.fromHeight(50)),
              onPressed: _postJournalEntry,
              child: const Text('Post Voucher & Update Ledgers'),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 6. FINANCIAL REPORTS (Trial Balance / P&L Overview)
// ============================================================================
class FinancialReportsScreen extends StatelessWidget {
  final String firmId;
  const FinancialReportsScreen({super.key, required this.firmId});

  @override
  Widget build(BuildContext context) {
    final Box db = Hive.box('master_accounting_db');
    List accounts = db.get('accounts_$firmId', defaultValue: []);

    double totalAssets = 0;
    double totalIncome = 0;
    double totalExpenses = 0;

    for (var acc in accounts) {
      double bal = (acc['balance'] ?? 0.0).toDouble();
      if (acc['type'] == 'Asset') totalAssets += bal;
      if (acc['type'] == 'Income') totalIncome += bal.abs();
      if (acc['type'] == 'Expense') totalExpenses += bal.abs();
    }

    double netProfit = totalIncome - totalExpenses;

    return Scaffold(
      appBar: AppBar(backgroundColor: const Color(0xFF1B365D), title: const Text('Financial Reports Summary', style: TextStyle(color: Colors.white))),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            _reportCard('Total Assets Balance', '₹ $totalAssets', Colors.blue),
            _reportCard('Total Income (Sales)', '₹ $totalIncome', Colors.green),
            _reportCard('Total Expenses', '₹ $totalExpenses', Colors.orange),
            const Divider(height: 30),
            _reportCard('Net Profit / Loss', '₹ $netProfit', netProfit >= 0 ? Colors.green : Colors.red, isBold: true),
          ],
        ),
      ),
    );
  }

  Widget _reportCard(String title, String value, Color color, {bool isBold = false}) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListTile(
        title: Text(title, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        trailing: Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
      ),
    );
  }
}
