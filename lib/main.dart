import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('app_user_session');
  await Hive.openBox('master_accounting_db');
  runApp(const TallyProAccountingApp());
}

// ============================================================================
// 1. DATA MODELS & ENUMS
// ============================================================================
enum FirmType { manufacturing, retail, service, trader, custom }
enum AccountGroupType { asset, liability, equity, revenue, expense }

class LedgerAccount {
  final String id;
  final String firmId;
  String name;
  AccountGroupType groupType;
  String subGroup;
  String? hsnCode;
  double gstRate;
  double openingBalance;
  String opType; // 'Dr' or 'Cr'

  LedgerAccount({
    required this.id,
    required this.firmId,
    required this.name,
    required this.groupType,
    required this.subGroup,
    this.hsnCode,
    this.gstRate = 0.0,
    required this.openingBalance,
    required this.opType,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'firmId': firmId,
        'name': name,
        'groupType': groupType.name,
        'subGroup': subGroup,
        'hsnCode': hsnCode,
        'gstRate': gstRate,
        'openingBalance': openingBalance,
        'opType': opType,
      };

  factory LedgerAccount.fromMap(Map<String, dynamic> map) => LedgerAccount(
        id: map['id'],
        firmId: map['firmId'],
        name: map['name'],
        groupType: AccountGroupType.values.byName(map['groupType']),
        subGroup: map['subGroup'] ?? 'General',
        hsnCode: map['hsnCode'],
        gstRate: (map['gstRate'] ?? 0.0).toDouble(),
        openingBalance: (map['openingBalance'] ?? 0.0).toDouble(),
        opType: map['opType'] ?? 'Dr',
      );
}

class JournalEntryLine {
  final String accountId;
  final String accountName;
  final double debit;
  final double credit;

  JournalEntryLine({
    required this.accountId,
    required this.accountName,
    required this.debit,
    required this.credit,
  });

  Map<String, dynamic> toMap() => {
        'accountId': accountId,
        'accountName': accountName,
        'debit': debit,
        'credit': credit,
      };

  factory JournalEntryLine.fromMap(Map<String, dynamic> map) => JournalEntryLine(
        accountId: map['accountId'],
        accountName: map['accountName'] ?? '',
        debit: (map['debit'] ?? 0.0).toDouble(),
        credit: (map['credit'] ?? 0.0).toDouble(),
      );
}

class FinancialVoucher {
  final String id;
  final String firmId;
  final String voucherType;
  final String voucherNo;
  final String date;
  final String narration;
  final List<JournalEntryLine> lines;

  FinancialVoucher({
    required this.id,
    required this.firmId,
    required this.voucherType,
    required this.voucherNo,
    required this.date,
    required this.narration,
    required this.lines,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'firmId': firmId,
        'voucherType': voucherType,
        'voucherNo': voucherNo,
        'date': date,
        'narration': narration,
        'lines': lines.map((x) => x.toMap()).toList(),
      };

  factory FinancialVoucher.fromMap(Map<String, dynamic> map) => FinancialVoucher(
        id: map['id'],
        firmId: map['firmId'],
        voucherType: map['voucherType'],
        voucherNo: map['voucherNo'],
        date: map['date'],
        narration: map['narration'] ?? '',
        lines: (map['lines'] as List).map((x) => JournalEntryLine.fromMap(Map<String, dynamic>.from(x))).toList(),
      );

  bool get isBalanced {
    double dr = lines.fold(0.0, (s, l) => s + l.debit);
    double cr = lines.fold(0.0, (s, l) => s + l.credit);
    return (dr - cr).abs() < 0.001 && dr > 0;
  }
}

// ============================================================================
// 2. ROOT APPLICATION
// ============================================================================
class TallyProAccountingApp extends StatelessWidget {
  const TallyProAccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionBox = Hive.box('app_user_session');
    bool isLoggedIn = sessionBox.get('is_logged_in', defaultValue: false);

    return MaterialApp(
      title: 'TallyPro Accounting Engine',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF005A9C),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF005A9C),
          primary: const Color(0xFF005A9C),
          secondary: const Color(0xFF008080),
        ),
      ),
      home: isLoggedIn ? const MultiFirmSelectorScreen() : const MobileAuthScreen(),
    );
  }
}

// ============================================================================
// 3. AUTHENTICATION (MOBILE OTP)
// ============================================================================
class MobileAuthScreen extends StatefulWidget {
  const MobileAuthScreen({super.key});

  @override
  State<MobileAuthScreen> createState() => _MobileAuthScreenState();
}

class _MobileAuthScreenState extends State<MobileAuthScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;

  void _handleSendOtp() {
    if (_phoneController.text.trim().length == 10) {
      setState(() => _otpSent = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('OTP sent successfully. Demo Code: 123456')),
      );
    }
  }

  void _handleVerifyOtp() {
    if (_otpController.text.trim() == "123456") {
      final sessionBox = Hive.box('app_user_session');
      sessionBox.put('is_logged_in', true);
      sessionBox.put('user_phone', _phoneController.text.trim());

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (ctx) => const MultiFirmSelectorScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TallyPro ERP Login', style: TextStyle(color: Colors.white)), backgroundColor: const Color(0xFF005A9C)),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.account_balance_wallet, size: 70, color: Color(0xFF005A9C)),
            const SizedBox(height: 16),
            const Text('Secure Mobile Login', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              enabled: !_otpSent,
              decoration: const InputDecoration(labelText: 'Mobile Number', prefixText: '+91 ', border: OutlineInputBorder()),
            ),
            if (_otpSent) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'OTP (123456)', border: OutlineInputBorder()),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005A9C), foregroundColor: Colors.white),
                onPressed: _otpSent ? _handleVerifyOtp : _handleSendOtp,
                child: Text(_otpSent ? 'Verify OTP' : 'Send Verification OTP'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 4. MULTI-FIRM SELECTOR & TEMPLATE SEEDING
// ============================================================================
class MultiFirmSelectorScreen extends StatefulWidget {
  const MultiFirmSelectorScreen({super.key});

  @override
  State<MultiFirmSelectorScreen> createState() => _MultiFirmSelectorScreenState();
}

class _MultiFirmSelectorScreenState extends State<MultiFirmSelectorScreen> {
  final Box _db = Hive.box('master_accounting_db');

  void _showCreateFirmDialog() {
    final nameCtrl = TextEditingController();
    final gstCtrl = TextEditingController();
    final stateCodeCtrl = TextEditingController(text: '08');
    FirmType selectedType = FirmType.manufacturing;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Register New Company / Firm'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Firm Legal Name *', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                DropdownButtonFormField<FirmType>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Business Nature *', border: OutlineInputBorder()),
                  items: FirmType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.name.toUpperCase()))).toList(),
                  onChanged: (v) => setDlgState(() => selectedType = v!),
                ),
                const SizedBox(height: 10),
                TextField(controller: gstCtrl, decoration: const InputDecoration(labelText: 'GSTIN (Optional)', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: stateCodeCtrl, decoration: const InputDecoration(labelText: 'State Code (e.g. 08)', border: OutlineInputBorder())),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005A9C), foregroundColor: Colors.white),
              onPressed: () {
                if (nameCtrl.text.trim().isNotEmpty) {
                  String firmId = 'firm_${DateTime.now().millisecondsSinceEpoch}';
                  List firms = _db.get('firms_registry', defaultValue: []);
                  firms.add({
                    'id': firmId,
                    'name': nameCtrl.text.trim(),
                    'firmType': selectedType.name,
                    'gstin': gstCtrl.text.trim(),
                    'stateCode': stateCodeCtrl.text.trim(),
                  });
                  _db.put('firms_registry', firms);
                  _seedChartOfAccounts(firmId, selectedType);

                  Navigator.pop(ctx);
                  setState(() {});
                }
              },
              child: const Text('Create Firm'),
            )
          ],
        ),
      ),
    );
  }

  void _seedChartOfAccounts(String firmId, FirmType type) {
    List<LedgerAccount> baseCOA = [
      LedgerAccount(id: 'acc_cash', firmId: firmId, name: 'Cash-in-Hand', groupType: AccountGroupType.asset, subGroup: 'Cash Equivalents', openingBalance: 0, opType: 'Dr'),
      LedgerAccount(id: 'acc_bank', firmId: firmId, name: 'Main Operating Bank', groupType: AccountGroupType.asset, subGroup: 'Bank Accounts', openingBalance: 0, opType: 'Dr'),
      LedgerAccount(id: 'acc_capital', firmId: firmId, name: 'Owner Capital Account', groupType: AccountGroupType.equity, subGroup: 'Capital Account', openingBalance: 0, opType: 'Cr'),
      LedgerAccount(id: 'acc_cgst', firmId: firmId, name: 'Duties & Taxes (CGST)', groupType: AccountGroupType.liability, subGroup: 'Duties & Taxes', openingBalance: 0, opType: 'Cr'),
      LedgerAccount(id: 'acc_sgst', firmId: firmId, name: 'Duties & Taxes (SGST)', groupType: AccountGroupType.liability, subGroup: 'Duties & Taxes', openingBalance: 0, opType: 'Cr'),
      LedgerAccount(id: 'acc_igst', firmId: firmId, name: 'Duties & Taxes (IGST)', groupType: AccountGroupType.liability, subGroup: 'Duties & Taxes', openingBalance: 0, opType: 'Cr'),
    ];

    if (type == FirmType.manufacturing) {
      baseCOA.addAll([
        LedgerAccount(id: 'acc_raw_stock', firmId: firmId, name: 'Raw Material Inventory', groupType: AccountGroupType.asset, subGroup: 'Stock-in-Hand', openingBalance: 0, opType: 'Dr'),
        LedgerAccount(id: 'acc_sales', firmId: firmId, name: 'Manufacturing Sales Account', groupType: AccountGroupType.revenue, subGroup: 'Sales Accounts', hsnCode: '6810', gstRate: 18.0, openingBalance: 0, opType: 'Cr'),
        LedgerAccount(id: 'acc_purchase', firmId: firmId, name: 'Raw Material Purchase Account', groupType: AccountGroupType.expense, subGroup: 'Purchase Accounts', openingBalance: 0, opType: 'Dr'),
      ]);
    } else {
      baseCOA.addAll([
        LedgerAccount(id: 'acc_sales', firmId: firmId, name: 'Primary Sales Revenue', groupType: AccountGroupType.revenue, subGroup: 'Sales Accounts', hsnCode: '9983', gstRate: 18.0, openingBalance: 0, opType: 'Cr'),
        LedgerAccount(id: 'acc_purchase', firmId: firmId, name: 'Direct Expense / Purchase', groupType: AccountGroupType.expense, subGroup: 'Direct Expenses', openingBalance: 0, opType: 'Dr'),
      ]);
    }

    _db.put('accounts_$firmId', baseCOA.map((a) => a.toMap()).toList());
    _db.put('vouchers_$firmId', []);
  }

  @override
  Widget build(BuildContext context) {
    List firms = _db.get('firms_registry', defaultValue: []);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gateway of Tally - Select Company', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF005A9C),
      ),
      body: firms.isEmpty
          ? Center(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005A9C), foregroundColor: Colors.white),
                onPressed: _showCreateFirmDialog,
                icon: const Icon(Icons.add),
                label: const Text('Create Company Profile'),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: firms.length,
              itemBuilder: (ctx, i) {
                var f = firms[i];
                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(backgroundColor: Color(0xFF005A9C), child: Icon(Icons.business, color: Colors.white)),
                    title: Text(f['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Category: ${f['firmType'].toString().toUpperCase()} | GST: ${f['gstin']}'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (ctx) => MainTallyErpDashboard(firmData: Map<String, dynamic>.from(f))),
                      );
                    },
                  ),
                );
              },
            ),
      floatingActionButton: firms.isNotEmpty
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF005A9C),
              onPressed: _showCreateFirmDialog,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Add Company', style: TextStyle(color: Colors.white)),
            )
          : null,
    );
  }
}

// ============================================================================
// 5. MAIN WORKSPACE WITH KEYBOARD HOTKEYS SUPPORT
// ============================================================================
class MainTallyErpDashboard extends StatefulWidget {
  final Map<String, dynamic> firmData;
  const MainTallyErpDashboard({super.key, required this.firmData});

  @override
  State<MainTallyErpDashboard> createState() => _MainTallyErpDashboardState();
}

class _MainTallyErpDashboardState extends State<MainTallyErpDashboard> {
  int _selectedTab = 0;

  @override
  Widget build(BuildContext context) {
    List<Widget> screens = [
      LedgerManagementView(firmId: widget.firmData['id']),
      VoucherPostingView(firmId: widget.firmData['id']),
      DayBookRegisterScreen(firmId: widget.firmData['id']),
      GstPdfBillingView(firmData: widget.firmData),
    ];

    return Shortcuts(
      shortcuts: <LogicalKeySet, Intent>{
        LogicalKeySet(LogicalKeyboardKey.alt, LogicalKeyboardKey.keyA): const SelectTabIntent(0),
        LogicalKeySet(LogicalKeyboardKey.alt, LogicalKeyboardKey.keyV): const SelectTabIntent(1),
        LogicalKeySet(LogicalKeyboardKey.alt, LogicalKeyboardKey.keyD): const SelectTabIntent(2),
        LogicalKeySet(LogicalKeyboardKey.alt, LogicalKeyboardKey.keyP): const SelectTabIntent(3),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          SelectTabIntent: CallbackAction<SelectTabIntent>(
            onInvoke: (intent) => setState(() => _selectedTab = intent.index),
          ),
        },
        child: Focus(
          autofocus: true,
          child: Scaffold(
            appBar: AppBar(
              backgroundColor: const Color(0xFF005A9C),
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.firmData['name'], style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  const Text('Alt+A: Accounts | Alt+V: Vouchers | Alt+D: DayBook | Alt+P: Print', style: TextStyle(color: Colors.white70, fontSize: 11)),
                ],
              ),
            ),
            body: screens[_selectedTab],
            bottomNavigationBar: BottomNavigationBar(
              currentIndex: _selectedTab,
              selectedItemColor: const Color(0xFF005A9C),
              unselectedItemColor: Colors.grey,
              type: BottomNavigationBarType.fixed,
              onTap: (index) => setState(() => _selectedTab = index),
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.account_tree), label: 'Accounts (Alt+A)'),
                BottomNavigationBarItem(icon: Icon(Icons.post_add), label: 'Vouchers (Alt+V)'),
                BottomNavigationBarItem(icon: Icon(Icons.menu_book), label: 'DayBook (Alt+D)'),
                BottomNavigationBarItem(icon: Icon(Icons.picture_as_pdf), label: 'GST Invoice (Alt+P)'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class SelectTabIntent extends Intent {
  final int index;
  const SelectTabIntent(this.index);
}

// ============================================================================
// 6. EDITABLE LEDGER MASTER MANAGEMENT
// ============================================================================
class LedgerManagementView extends StatefulWidget {
  final String firmId;
  const LedgerManagementView({super.key, required this.firmId});

  @override
  State<LedgerManagementView> createState() => _LedgerManagementViewState();
}

class _LedgerManagementViewState extends State<LedgerManagementView> {
  final Box _db = Hive.box('master_accounting_db');

  void _showLedgerModal({LedgerAccount? accountToEdit}) {
    final nameCtrl = TextEditingController(text: accountToEdit?.name ?? '');
    final hsnCtrl = TextEditingController(text: accountToEdit?.hsnCode ?? '');
    final gstRateCtrl = TextEditingController(text: (accountToEdit?.gstRate ?? 18.0).toString());
    final opBalCtrl = TextEditingController(text: (accountToEdit?.openingBalance ?? 0.0).toString());
    AccountGroupType selectedGroup = accountToEdit?.groupType ?? AccountGroupType.asset;
    String opType = accountToEdit?.opType ?? 'Dr';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: Text(accountToEdit == null ? 'Create Account Ledger' : 'Edit Account Ledger'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Ledger Name *', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                DropdownButtonFormField<AccountGroupType>(
                  value: selectedGroup,
                  decoration: const InputDecoration(labelText: 'Account Group *', border: OutlineInputBorder()),
                  items: AccountGroupType.values.map((g) => DropdownMenuItem(value: g, child: Text(g.name.toUpperCase()))).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDlgState(() {
                        selectedGroup = val;
                        opType = (val == AccountGroupType.asset || val == AccountGroupType.expense) ? 'Dr' : 'Cr';
                      });
                    }
                  },
                ),
                const SizedBox(height: 10),
                TextField(controller: hsnCtrl, decoration: const InputDecoration(labelText: 'HSN/SAC Code', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: gstRateCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'GST Tax Rate (%)', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: TextField(controller: opBalCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Opening Balance (₹)', border: OutlineInputBorder()))),
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
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005A9C), foregroundColor: Colors.white),
              onPressed: () {
                if (nameCtrl.text.trim().isNotEmpty) {
                  List rawList = _db.get('accounts_${widget.firmId}', defaultValue: []);
                  List<LedgerAccount> accounts = rawList.map((x) => LedgerAccount.fromMap(Map<String, dynamic>.from(x))).toList();

                  if (accountToEdit == null) {
                    accounts.add(LedgerAccount(
                      id: 'acc_${DateTime.now().millisecondsSinceEpoch}',
                      firmId: widget.firmId,
                      name: nameCtrl.text.trim(),
                      groupType: selectedGroup,
                      subGroup: 'Custom Master',
                      hsnCode: hsnCtrl.text.trim(),
                      gstRate: double.tryParse(gstRateCtrl.text) ?? 0.0,
                      openingBalance: double.tryParse(opBalCtrl.text) ?? 0.0,
                      opType: opType,
                    ));
                  } else {
                    int index = accounts.indexWhere((a) => a.id == accountToEdit.id);
                    if (index != -1) {
                      accounts[index].name = nameCtrl.text.trim();
                      accounts[index].groupType = selectedGroup;
                      accounts[index].hsnCode = hsnCtrl.text.trim();
                      accounts[index].gstRate = double.tryParse(gstRateCtrl.text) ?? 0.0;
                      accounts[index].openingBalance = double.tryParse(opBalCtrl.text) ?? 0.0;
                      accounts[index].opType = opType;
                    }
                  }

                  _db.put('accounts_${widget.firmId}', accounts.map((a) => a.toMap()).toList());
                  Navigator.pop(ctx);
                  setState(() {});
                }
              },
              child: const Text('Save Master'),
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    List rawList = _db.get('accounts_${widget.firmId}', defaultValue: []);
    List<LedgerAccount> accounts = rawList.map((x) => LedgerAccount.fromMap(Map<String, dynamic>.from(x))).toList();

    return Scaffold(
      body: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: accounts.length,
        itemBuilder: (ctx, i) {
          var acc = accounts[i];
          return Card(
            child: ListTile(
              title: Text(acc.name, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Group: ${acc.groupType.name.toUpperCase()} | HSN: ${acc.hsnCode ?? "N/A"}'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('₹ ${acc.openingBalance.toStringAsFixed(2)} ${acc.opType}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.edit, color: Color(0xFF005A9C)),
                    onPressed: () => _showLedgerModal(accountToEdit: acc),
                  )
                ],
              ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF005A9C),
        onPressed: () => _showLedgerModal(),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Create Ledger', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}

// ============================================================================
// 7. TRANSACTION VOUCHER ENTRY
// ============================================================================
class VoucherPostingView extends StatefulWidget {
  final String firmId;
  const VoucherPostingView({super.key, required this.firmId});

  @override
  State<VoucherPostingView> createState() => _VoucherPostingViewState();
}

class _VoucherPostingViewState extends State<VoucherPostingView> {
  final Box _db = Hive.box('master_accounting_db');

  void _openVoucherModal(String type) {
    List rawAccounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
    List<LedgerAccount> accounts = rawAccounts.map((x) => LedgerAccount.fromMap(Map<String, dynamic>.from(x))).toList();

    if (accounts.length < 2) return;

    LedgerAccount drAcc = accounts.first;
    LedgerAccount crAcc = accounts.last;
    final amtCtrl = TextEditingController();
    final narCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: Text('Post $type Voucher'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: drAcc.id,
                decoration: const InputDecoration(labelText: 'Debit Account (Dr)', border: OutlineInputBorder()),
                items: accounts.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))).toList(),
                onChanged: (v) => setDlgState(() => drAcc = accounts.firstWhere((a) => a.id == v)),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: crAcc.id,
                decoration: const InputDecoration(labelText: 'Credit Account (Cr)', border: OutlineInputBorder()),
                items: accounts.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))).toList(),
                onChanged: (v) => setDlgState(() => crAcc = accounts.firstWhere((a) => a.id == v)),
              ),
              const SizedBox(height: 10),
              TextField(controller: amtCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount (₹)', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: narCtrl, decoration: const InputDecoration(labelText: 'Narration', border: OutlineInputBorder())),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005A9C), foregroundColor: Colors.white),
              onPressed: () {
                double amt = double.tryParse(amtCtrl.text) ?? 0;
                if (drAcc.id != crAcc.id && amt > 0) {
                  List vouchers = _db.get('vouchers_${widget.firmId}', defaultValue: []);
                  vouchers.add(FinancialVoucher(
                    id: 'vch_${DateTime.now().millisecondsSinceEpoch}',
                    firmId: widget.firmId,
                    voucherType: type,
                    voucherNo: '${vouchers.length + 1}',
                    date: DateFormat('yyyy-MM-dd').format(DateTime.now()),
                    narration: narCtrl.text.trim(),
                    lines: [
                      JournalEntryLine(accountId: drAcc.id, accountName: drAcc.name, debit: amt, credit: 0.0),
                      JournalEntryLine(accountId: crAcc.id, accountName: crAcc.name, debit: 0.0, credit: amt),
                    ],
                  ).toMap());

                  _db.put('vouchers_${widget.firmId}', vouchers);
                  Navigator.pop(ctx);
                  setState(() {});
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
        ListTile(leading: const Icon(Icons.receipt, color: Colors.green), title: const Text('Sales Voucher'), onTap: () => _openVoucherModal('Sales')),
        ListTile(leading: const Icon(Icons.shopping_cart, color: Colors.orange), title: const Text('Purchase Voucher'), onTap: () => _openVoucherModal('Purchase')),
        ListTile(leading: const Icon(Icons.upload, color: Colors.red), title: const Text('Payment Voucher'), onTap: () => _openVoucherModal('Payment')),
        ListTile(leading: const Icon(Icons.download, color: Colors.teal), title: const Text('Receipt Voucher'), onTap: () => _openVoucherModal('Receipt')),
      ],
    );
  }
}

// ============================================================================
// 8. DAY BOOK REGISTER VIEW
// ============================================================================
class DayBookRegisterScreen extends StatelessWidget {
  final String firmId;
  const DayBookRegisterScreen({super.key, required this.firmId});

  @override
  Widget build(BuildContext context) {
    final Box db = Hive.box('master_accounting_db');
    List rawList = db.get('vouchers_$firmId', defaultValue: []);
    List<FinancialVoucher> vouchers = rawList.map((x) => FinancialVoucher.fromMap(Map<String, dynamic>.from(x))).toList().reversed.toList();

    return Scaffold(
      body: vouchers.isEmpty
          ? const Center(child: Text('Day Book register is empty.'))
          : ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: vouchers.length,
              itemBuilder: (ctx, i) {
                var v = vouchers[i];
                double amt = v.lines.fold(0.0, (s, l) => s + l.debit);

                return Card(
                  child: ExpansionTile(
                    title: Text('${v.voucherType} Voucher #${v.voucherNo}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Date: ${v.date} | Ref: ${v.narration}'),
                    trailing: Text('₹ ${amt.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF005A9C))),
                    children: v.lines.map((l) => ListTile(
                      dense: true,
                      title: Text(l.accountName),
                      trailing: Text(l.debit > 0 ? 'Dr ₹${l.debit}' : 'Cr ₹${l.credit}', style: TextStyle(color: l.debit > 0 ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
                    )).toList(),
                  ),
                );
              },
            ),
    );
  }
}

// ============================================================================
// 9. GST TAX INVOICE & PDF ENGINE (FIXED PARAMETER ISSUE)
// ============================================================================
class GstPdfBillingView extends StatefulWidget {
  final Map<String, dynamic> firmData;
  const GstPdfBillingView({super.key, required this.firmData});

  @override
  State<GstPdfBillingView> createState() => _GstPdfBillingViewState();
}

class _GstPdfBillingViewState extends State<GstPdfBillingView> {
  final _customerNameCtrl = TextEditingController();
  final _customerGstinCtrl = TextEditingController();
  final _itemCtrl = TextEditingController();
  final _hsnCtrl = TextEditingController(text: '6810');
  final _qtyCtrl = TextEditingController(text: '1');
  final _rateCtrl = TextEditingController(text: '0.00');

  Future<void> _exportPdf() async {
    final pdf = pw.Document();
    double qty = double.tryParse(_qtyCtrl.text) ?? 1;
    double rate = double.tryParse(_rateCtrl.text) ?? 0;
    double taxable = qty * rate;
    double tax = taxable * 0.18;
    double grandTotal = taxable + tax;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start, // FIXED PARAMETER NAME HERE
          children: [
            pw.Text('TAX INVOICE', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold)),
            pw.Text('Firm: ${widget.firmData['name']} | GSTIN: ${widget.firmData['gstin']}'),
            pw.Divider(),
            pw.Text('Customer: ${_customerNameCtrl.text} | GSTIN: ${_customerGstinCtrl.text}'),
            pw.SizedBox(height: 20),
            pw.Table.fromTextArray(
              headers: ['Item', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST', 'Total'],
              data: [
                [_itemCtrl.text, _hsnCtrl.text, qty.toString(), rate.toStringAsFixed(2), taxable.toStringAsFixed(2), '18%', grandTotal.toStringAsFixed(2)]
              ],
            ),
            pw.SizedBox(height: 20),
            pw.Align(alignment: pw.Alignment.centerRight, child: pw.Text('Grand Total: INR ${grandTotal.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold))),
          ],
        ),
      ),
    );

    await Printing.layoutPdf(onLayout: (format) async => pdf.save());
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: SingleChildScrollView(
        child: Column(
          children: [
            const Text('Professional Invoice Generator', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            TextField(controller: _customerNameCtrl, decoration: const InputDecoration(labelText: 'Customer Name *', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _customerGstinCtrl, decoration: const InputDecoration(labelText: 'Customer GSTIN', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _itemCtrl, decoration: const InputDecoration(labelText: 'Item Name', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: TextField(controller: _hsnCtrl, decoration: const InputDecoration(labelText: 'HSN Code', border: OutlineInputBorder()))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: _qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity', border: OutlineInputBorder()))),
              ],
            ),
            const SizedBox(height: 10),
            TextField(controller: _rateCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price Rate (₹)', border: OutlineInputBorder())),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005A9C), foregroundColor: Colors.white, minimumSize: const Size(double.infinity, 50)),
              onPressed: _exportPdf,
              icon: const Icon(Icons.picture_as_pdf),
              label: const Text('Generate & Save PDF Invoice'),
            ),
          ],
        ),
      ),
    );
  }
}
