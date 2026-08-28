import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/intl.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('master_accounting_db');
  runApp(const ProAccountingApp());
}

class ProAccountingApp extends StatelessWidget {
  const ProAccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Professional Accounting Engine',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF1B365D),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1B365D),
          primary: const Color(0xFF1B365D),
        ),
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
        title: const Text('Create New Business / Firm'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Firm Name *', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: gstCtrl, decoration: const InputDecoration(labelText: 'GSTIN / Registration No.', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.trim().isNotEmpty) {
                String firmId = 'firm_${DateTime.now().millisecondsSinceEpoch}';
                List firms = _db.get('firms_list', defaultValue: []);
                firms.add({'id': firmId, 'name': nameCtrl.text.trim(), 'gst': gstCtrl.text.trim()});
                _db.put('firms_list', firms);

                _initializeDefaultChartOfAccounts(firmId);

                Navigator.pop(ctx);
                setState(() {});
              }
            },
            child: const Text('Create Firm'),
          )
        ],
      ),
    );
  }

  void _initializeDefaultChartOfAccounts(String firmId) {
    List defaultAccounts = [
      {'id': 'acc_cash', 'name': 'Cash-in-Hand', 'group': 'Asset', 'openingBalance': 0.0, 'opType': 'Dr'},
      {'id': 'acc_bank', 'name': 'Main Bank Account', 'group': 'Asset', 'openingBalance': 0.0, 'opType': 'Dr'},
      {'id': 'acc_sales', 'name': 'Sales Account', 'group': 'Income', 'openingBalance': 0.0, 'opType': 'Cr'},
      {'id': 'acc_purchase', 'name': 'Purchase Account', 'group': 'Expense', 'openingBalance': 0.0, 'opType': 'Dr'},
      {'id': 'acc_capital', 'name': 'Owner Capital Account', 'group': 'Capital', 'openingBalance': 0.0, 'opType': 'Cr'},
      {'id': 'acc_office_exp', 'name': 'General Office Expense', 'group': 'Expense', 'openingBalance': 0.0, 'opType': 'Dr'},
    ];
    _db.put('accounts_$firmId', defaultAccounts);
    _db.put('vouchers_$firmId', []);
  }

  @override
  Widget build(BuildContext context) {
    List firms = _db.get('firms_list', defaultValue: []);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B365D),
        title: const Text('Select Business / Firm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: firms.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.business_center, size: 70, color: Colors.grey),
                  const SizedBox(height: 12),
                  const Text('Koi Firm Bani Hui Nahi Hai', style: TextStyle(fontSize: 16, color: Colors.grey, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B365D), foregroundColor: Colors.white),
                    onPressed: _showAddFirmDialog,
                    icon: const Icon(Icons.add),
                    label: const Text('Create First Business'),
                  )
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: firms.length,
              itemBuilder: (ctx, i) {
                var firm = firms[i];
                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  elevation: 2,
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFF1B365D),
                      child: Icon(Icons.store, color: Colors.white),
                    ),
                    title: Text(firm['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    subtitle: Text('GSTIN: ${firm['gst'].isEmpty ? "Not Provided" : firm['gst']}'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (ctx) => MainDashboardScreen(firmId: firm['id'], firmName: firm['name']),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
      floatingActionButton: firms.isNotEmpty
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF1B365D),
              onPressed: _showAddFirmDialog,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Add Business', style: TextStyle(color: Colors.white)),
            )
          : null,
    );
  }
}

// ============================================================================
// 2. MAIN WORKSPACE DASHBOARD
// ============================================================================
class MainDashboardScreen extends StatefulWidget {
  final String firmId;
  final String firmName;
  const MainDashboardScreen({super.key, required this.firmId, required this.firmName});

  @override
  State<MainDashboardScreen> createState() => _MainDashboardScreenState();
}

class _MainDashboardScreenState extends State<MainDashboardScreen> {
  int _selectedTab = 0;

  @override
  Widget build(BuildContext context) {
    List<Widget> screens = [
      ChartOfAccountsScreen(firmId: widget.firmId),
      VoucherEntryCenterScreen(firmId: widget.firmId),
      DayBookScreen(firmId: widget.firmId),
      FinancialReportsScreen(firmId: widget.firmId),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B365D),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.firmName, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const Text('Double-Entry Accounting Engine', style: TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
      ),
      body: screens[_selectedTab],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTab,
        selectedItemColor: const Color(0xFF1B365D),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        onTap: (index) => setState(() => _selectedTab = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.account_tree), label: 'Accounts'),
          BottomNavigationBarItem(icon: Icon(Icons.post_add), label: 'Vouchers'),
          BottomNavigationBarItem(icon: Icon(Icons.menu_book), label: 'Day Book'),
          BottomNavigationBarItem(icon: Icon(Icons.pie_chart), label: 'Reports'),
        ],
      ),
    );
  }
}

// ============================================================================
// 3. CUSTOM CHART OF ACCOUNTS & LEDGER CREATION
// ============================================================================
class ChartOfAccountsScreen extends StatefulWidget {
  final String firmId;
  const ChartOfAccountsScreen({super.key, required this.firmId});

  @override
  State<ChartOfAccountsScreen> createState() => _ChartOfAccountsScreenState();
}

class _ChartOfAccountsScreenState extends State<ChartOfAccountsScreen> {
  final Box _db = Hive.box('master_accounting_db');

  void _showAddCustomAccountDialog() {
    final nameCtrl = TextEditingController();
    final opBalCtrl = TextEditingController(text: '0');
    String selectedGroup = 'Asset';
    String opType = 'Dr';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Create Custom Account / Ledger'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Account / Party Name *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedGroup,
                  decoration: const InputDecoration(labelText: 'Account Group / Type *', border: OutlineInputBorder()),
                  items: ['Asset', 'Liability', 'Income', 'Expense', 'Capital']
                      .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDlgState(() {
                        selectedGroup = val;
                        opType = (val == 'Asset' || val == 'Expense') ? 'Dr' : 'Cr';
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: opBalCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Opening Balance (₹)', border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(width: 8),
                    DropdownButton<String>(
                      value: opType,
                      items: ['Dr', 'Cr'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setDlgState(() => opType = v!),
                    )
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (nameCtrl.text.trim().isNotEmpty) {
                  List accounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
                  String accId = 'acc_${DateTime.now().millisecondsSinceEpoch}';
                  accounts.add({
                    'id': accId,
                    'name': nameCtrl.text.trim(),
                    'group': selectedGroup,
                    'openingBalance': double.tryParse(opBalCtrl.text) ?? 0.0,
                    'opType': opType,
                  });
                  _db.put('accounts_${widget.firmId}', accounts);
                  Navigator.pop(ctx);
                  setState(() {});
                }
              },
              child: const Text('Save Account'),
            )
          ],
        ),
      ),
    );
  }

  Map<String, double> _calculateAccountBalances() {
    List accounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
    List vouchers = _db.get('vouchers_${widget.firmId}', defaultValue: []);
    Map<String, double> balances = {};

    for (var acc in accounts) {
      double bal = (acc['openingBalance'] ?? 0.0).toDouble();
      if (acc['opType'] == 'Cr') bal = -bal;
      balances[acc['id']] = bal;
    }

    for (var vch in vouchers) {
      List entries = vch['entries'] ?? [];
      for (var entry in entries) {
        String accId = entry['accountId'];
        double dr = (entry['dr'] ?? 0.0).toDouble();
        double cr = (entry['cr'] ?? 0.0).toDouble();

        if (balances.containsKey(accId)) {
          balances[accId] = balances[accId]! + dr - cr;
        }
      }
    }
    return balances;
  }

  @override
  Widget build(BuildContext context) {
    List accounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
    Map<String, double> balances = _calculateAccountBalances();

    return Scaffold(
      body: accounts.isEmpty
          ? const Center(child: Text('Koi Account nahi bana hai.'))
          : ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: accounts.length,
              itemBuilder: (ctx, i) {
                var acc = accounts[i];
                double netBal = balances[acc['id']] ?? 0.0;
                String sign = netBal >= 0 ? 'Dr' : 'Cr';

                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: ListTile(
                    title: Text(acc['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Group: ${acc['group']}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '₹ ${netBal.abs().toStringAsFixed(2)} $sign',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: netBal >= 0 ? Colors.green.shade700 : Colors.red.shade700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                      ],
                    ),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (ctx) => DetailedLedgerScreen(
                            firmId: widget.firmId,
                            accountId: acc['id'],
                            accountName: acc['name'],
                            group: acc['group'],
                            openingBal: (acc['openingBalance'] ?? 0.0).toDouble(),
                            opType: acc['opType'] ?? 'Dr',
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF1B365D),
        onPressed: _showAddCustomAccountDialog,
        icon: const Icon(Icons.add_card, color: Colors.white),
        label: const Text('New Custom Account', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}

// ============================================================================
// 4. DETAILED LEDGER STATEMENT (Khaata History View)
// ============================================================================
class DetailedLedgerScreen extends StatelessWidget {
  final String firmId;
  final String accountId;
  final String accountName;
  final String group;
  final double openingBal;
  final String opType;

  const DetailedLedgerScreen({
    super.key,
    required this.firmId,
    required this.accountId,
    required this.accountName,
    required this.group,
    required this.openingBal,
    required this.opType,
  });

  @override
  Widget build(BuildContext context) {
    final Box db = Hive.box('master_accounting_db');
    List vouchers = db.get('vouchers_$firmId', defaultValue: []);

    List<Map<String, dynamic>> statement = [];
    double runningBal = opType == 'Cr' ? -openingBal : openingBal;

    for (var vch in vouchers) {
      List entries = vch['entries'] ?? [];
      for (var entry in entries) {
        if (entry['accountId'] == accountId) {
          double dr = (entry['dr'] ?? 0.0).toDouble();
          double cr = (entry['cr'] ?? 0.0).toDouble();
          runningBal = runningBal + dr - cr;

          statement.add({
            'date': vch['date'],
            'vchType': vch['vchType'],
            'narration': vch['narration'] ?? '',
            'dr': dr,
            'cr': cr,
            'balance': runningBal,
          });
        }
      }
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B365D),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$accountName Ledger', style: const TextStyle(color: Colors.white, fontSize: 16)),
            Text('Group: $group', style: const TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.grey.shade200,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Opening Balance:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text('₹ ${openingBal.toStringAsFixed(2)} $opType', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Expanded(
            child: statement.isEmpty
                ? const Center(child: Text('Is account me abhi koi transaction nahi hai.'))
                : ListView.builder(
                    itemCount: statement.length,
                    itemBuilder: (ctx, i) {
                      var row = statement[i];
                      double bal = row['balance'];
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        child: Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('${row['date']}  [${row['vchType']}]', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  Text(
                                    'Closing: ₹ ${bal.abs().toStringAsFixed(2)} ${bal >= 0 ? "Dr" : "Cr"}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1B365D)),
                                  ),
                                ],
                              ),
                              if (row['narration'].toString().isNotEmpty)
                                Text('Ref: ${row['narration']}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Debit: ₹ ${row['dr']}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                                  Text('Credit: ₹ ${row['cr']}', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          )
        ],
      ),
    );
  }
}

// ============================================================================
// 5. TRANSACTION VOUCHER ENTRY CENTER
// ============================================================================
class VoucherEntryCenterScreen extends StatefulWidget {
  final String firmId;
  const VoucherEntryCenterScreen({super.key, required this.firmId});

  @override
  State<VoucherEntryCenterScreen> createState() => _VoucherEntryCenterScreenState();
}

class _VoucherEntryCenterScreenState extends State<VoucherEntryCenterScreen> {
  final Box _db = Hive.box('master_accounting_db');

  void _openVoucherDialog(String vchType) {
    List accounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
    if (accounts.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Kam se kam 2 Accounts hone zaroori hain.')));
      return;
    }

    String? drAccount = accounts.first['id'];
    String? crAccount = accounts.last['id'];
    final amountCtrl = TextEditingController();
    final narCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: Text('New $vchType Voucher'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: drAccount,
                  decoration: const InputDecoration(labelText: 'Debit Account (Dr. In)', border: OutlineInputBorder()),
                  items: accounts.map<DropdownMenuItem<String>>((a) => DropdownMenuItem(value: a['id'].toString(), child: Text(a['name'].toString()))).toList(),
                  onChanged: (v) => setDlgState(() => drAccount = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: crAccount,
                  decoration: const InputDecoration(labelText: 'Credit Account (Cr. Out)', border: OutlineInputBorder()),
                  items: accounts.map<DropdownMenuItem<String>>((a) => DropdownMenuItem(value: a['id'].toString(), child: Text(a['name'].toString()))).toList(),
                  onChanged: (v) => setDlgState(() => crAccount = v),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Total Amount (₹) *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: narCtrl,
                  decoration: const InputDecoration(labelText: 'Narration / Ref Note', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                double amt = double.tryParse(amountCtrl.text) ?? 0;
                if (drAccount != null && crAccount != null && drAccount != crAccount && amt > 0) {
                  List vouchers = _db.get('vouchers_${widget.firmId}', defaultValue: []);

                  vouchers.add({
                    'id': 'vch_${DateTime.now().millisecondsSinceEpoch}',
                    'date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
                    'vchType': vchType,
                    'narration': narCtrl.text.trim(),
                    'entries': [
                      {'accountId': drAccount, 'dr': amt, 'cr': 0.0},
                      {'accountId': crAccount, 'dr': 0.0, 'cr': amt},
                    ]
                  });

                  _db.put('vouchers_${widget.firmId}', vouchers);
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Voucher Posted & Ledgers Updated Successfully!')));
                }
              },
              child: const Text('Post Voucher'),
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _voucherCard('Sales Invoice', 'Bikri bill banayein (Customer Dr, Sales Cr)', Icons.receipt_long, Colors.green, () => _openVoucherDialog('Sales')),
        _voucherCard('Purchase Voucher', 'Kharidi ki entry karein (Purchase Dr, Supplier Cr)', Icons.shopping_cart, Colors.orange, () => _openVoucherDialog('Purchase')),
        _voucherCard('Payment Voucher', 'Khaton me bhugtan/kharcha karein (Exp/Party Dr, Cash/Bank Cr)', Icons.upload, Colors.red, () => _openVoucherDialog('Payment')),
        _voucherCard('Receipt Voucher', 'Paisa prapt ki entry karein (Cash/Bank Dr, Party/Income Cr)', Icons.download, Colors.teal, () => _openVoucherDialog('Receipt')),
        _voucherCard('Journal Voucher', 'Direct Debit/Credit adjustments', Icons.auto_stories, Colors.indigo, () => _openVoucherDialog('Journal')),
      ],
    );
  }

  Widget _voucherCard(String title, String subtitle, IconData icon, Color color, VoidCallback onTap) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 2,
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withOpacity(0.15), child: Icon(icon, color: color)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}

// ============================================================================
// 6. DAY BOOK SCREEN (Transaction Register Log)
// ============================================================================
class DayBookScreen extends StatelessWidget {
  final String firmId;
  const DayBookScreen({super.key, required this.firmId});

  @override
  Widget build(BuildContext context) {
    final Box db = Hive.box('master_accounting_db');
    List vouchers = db.get('vouchers_$firmId', defaultValue: []);

    return Scaffold(
      body: vouchers.isEmpty
          ? const Center(child: Text('Day Book khali hai. Koi voucher entry nahi hui.'))
          : ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: vouchers.length,
              itemBuilder: (ctx, i) {
                var v = vouchers[vouchers.length - 1 - i]; // Reverse order
                List entries = v['entries'] ?? [];
                double amt = entries.isNotEmpty ? (entries[0]['dr'] ?? 0.0).toDouble() : 0.0;

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                  child: ListTile(
                    leading: CircleAvatar(backgroundColor: const Color(0xFF1B365D), child: Text(v['vchType'][0], style: const TextStyle(color: Colors.white))),
                    title: Text('${v['vchType']} Voucher', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Date: ${v['date']} | ${v['narration']}'),
                    trailing: Text('₹ ${amt.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1B365D))),
                  ),
                );
              },
            ),
    );
  }
}

// ============================================================================
// 7. FINANCIAL REPORTS (Trial Balance, P&L, Balance Sheet)
// ============================================================================
class FinancialReportsScreen extends StatelessWidget {
  final String firmId;
  const FinancialReportsScreen({super.key, required this.firmId});

  @override
  Widget build(BuildContext context) {
    final Box db = Hive.box('master_accounting_db');
    List accounts = db.get('accounts_$firmId', defaultValue: []);
    List vouchers = db.get('vouchers_$firmId', defaultValue: []);

    double totalAssets = 0;
    double totalLiabilities = 0;
    double totalIncome = 0;
    double totalExpenses = 0;

    Map<String, double> balances = {};
    for (var acc in accounts) {
      double bal = (acc['openingBalance'] ?? 0.0).toDouble();
      if (acc['opType'] == 'Cr') bal = -bal;
      balances[acc['id']] = bal;
    }

    for (var vch in vouchers) {
      List entries = vch['entries'] ?? [];
      for (var entry in entries) {
        String accId = entry['accountId'];
        double dr = (entry['dr'] ?? 0.0).toDouble();
        double cr = (entry['cr'] ?? 0.0).toDouble();
        if (balances.containsKey(accId)) {
          balances[accId] = balances[accId]! + dr - cr;
        }
      }
    }

    for (var acc in accounts) {
      double netBal = balances[acc['id']] ?? 0.0;
      String grp = acc['group'];
      if (grp == 'Asset') totalAssets += netBal;
      if (grp == 'Liability') totalLiabilities += netBal.abs();
      if (grp == 'Income') totalIncome += netBal.abs();
      if (grp == 'Expense') totalExpenses += netBal.abs();
    }

    double netProfit = totalIncome - totalExpenses;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Business Financial Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        _reportTile('Total Assets (Sampatti)', '₹ ${totalAssets.toStringAsFixed(2)}', Colors.blue),
        _reportTile('Total Income (Sales/Aay)', '₹ ${totalIncome.toStringAsFixed(2)}', Colors.green),
        _reportTile('Total Expenses (Kharche)', '₹ ${totalExpenses.toStringAsFixed(2)}', Colors.orange),
        _reportTile('Total Liabilities (Denadari)', '₹ ${totalLiabilities.toStringAsFixed(2)}', Colors.purple),
        const Divider(height: 30),
        _reportTile('Net Profit / Loss', '₹ ${netProfit.toStringAsFixed(2)}', netProfit >= 0 ? Colors.green : Colors.red, isBold: true),
      ],
    );
  }

  Widget _reportTile(String title, String value, Color color, {bool isBold = false}) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListTile(
        title: Text(title, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        trailing: Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
      ),
    );
  }
}
