import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/intl.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('app_user_session');
  await Hive.openBox('master_accounting_db');
  runApp(const EnterpriseAccountingApp());
}

// ============================================================================
// 1. ENUMS & CORE DOMAIN MODELS
// ============================================================================
enum FirmType { manufacturing, retail, service, trader, other }
enum AccountGroupType { asset, liability, equity, revenue, expense }

class LedgerAccount {
  final String id;
  final String firmId;
  final String name;
  final AccountGroupType groupType;
  final String subGroup;
  final String? hsnCode;
  final double gstRate;
  final double openingBalance;
  final String opType; // 'Dr' or 'Cr'

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

// ============================================================================
// 2. MAIN APP ROUTER
// ============================================================================
class EnterpriseAccountingApp extends StatelessWidget {
  const EnterpriseAccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionBox = Hive.box('app_user_session');
    bool isLoggedIn = sessionBox.get('is_logged_in', defaultValue: false);

    return MaterialApp(
      title: 'Lenden Manager Engine',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF1B365D),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1B365D),
          primary: const Color(0xFF1B365D),
          secondary: const Color(0xFF008080),
        ),
      ),
      home: isLoggedIn ? const MultiFirmSelectorScreen() : const MobileAuthScreen(),
    );
  }
}

// ============================================================================
// 3. MOBILE OTP AUTHENTICATION SCREEN
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

  void _sendOtp() {
    if (_phoneController.text.trim().length == 10) {
      setState(() => _otpSent = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('OTP sent successfully: Use 123456 for testing.')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit mobile number.')),
      );
    }
  }

  void _verifyOtp() {
    if (_otpController.text.trim() == "123456") {
      final sessionBox = Hive.box('app_user_session');
      sessionBox.put('is_logged_in', true);
      sessionBox.put('user_phone', _phoneController.text.trim());

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (ctx) => const MultiFirmSelectorScreen()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid OTP. Enter 123456')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Book Authentication', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1B365D),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.security, size: 70, color: Color(0xFF1B365D)),
            const SizedBox(height: 16),
            const Text('Mobile Verification', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
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
                decoration: const InputDecoration(labelText: 'Enter OTP (123456)', border: OutlineInputBorder()),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B365D), foregroundColor: Colors.white),
                onPressed: _otpSent ? _verifyOtp : _sendOtp,
                child: Text(_otpSent ? 'Verify & Login' : 'Send OTP'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 4. MULTI-FIRM ONBOARDING WITH DYNAMIC COA
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
          title: const Text('Create New Business Firm', style: TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Firm Legal Name *', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                DropdownButtonFormField<FirmType>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Business Category *', border: OutlineInputBorder()),
                  items: FirmType.values.map((type) => DropdownMenuItem(value: type, child: Text(type.name.toUpperCase()))).toList(),
                  onChanged: (val) => setDlgState(() => selectedType = val!),
                ),
                const SizedBox(height: 10),
                TextField(controller: gstCtrl, decoration: const InputDecoration(labelText: 'GSTIN Number', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: stateCodeCtrl, decoration: const InputDecoration(labelText: 'State Code (e.g. 08)', border: OutlineInputBorder())),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B365D), foregroundColor: Colors.white),
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
                  _seedSuggestedChartOfAccounts(firmId, selectedType);

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

  void _seedSuggestedChartOfAccounts(String firmId, FirmType type) {
    List<LedgerAccount> accounts = [
      LedgerAccount(id: 'acc_cash', firmId: firmId, name: 'Cash-in-Hand', groupType: AccountGroupType.asset, subGroup: 'Cash Equivalents', openingBalance: 0, opType: 'Dr'),
      LedgerAccount(id: 'acc_bank', firmId: firmId, name: 'Main Operating Bank', groupType: AccountGroupType.asset, subGroup: 'Bank Accounts', openingBalance: 0, opType: 'Dr'),
      LedgerAccount(id: 'acc_capital', firmId: firmId, name: 'Owner Capital Account', groupType: AccountGroupType.equity, subGroup: 'Capital', openingBalance: 0, opType: 'Cr'),
      LedgerAccount(id: 'acc_cgst', firmId: firmId, name: 'Output CGST Account', groupType: AccountGroupType.liability, subGroup: 'Duties & Taxes', openingBalance: 0, opType: 'Cr'),
      LedgerAccount(id: 'acc_sgst', firmId: firmId, name: 'Output SGST Account', groupType: AccountGroupType.liability, subGroup: 'Duties & Taxes', openingBalance: 0, opType: 'Cr'),
      LedgerAccount(id: 'acc_igst', firmId: firmId, name: 'Output IGST Account', groupType: AccountGroupType.liability, subGroup: 'Duties & Taxes', openingBalance: 0, opType: 'Cr'),
    ];

    if (type == FirmType.manufacturing) {
      accounts.addAll([
        LedgerAccount(id: 'acc_raw_material', firmId: firmId, name: 'Raw Material Inventory', groupType: AccountGroupType.asset, subGroup: 'Stock', openingBalance: 0, opType: 'Dr'),
        LedgerAccount(id: 'acc_mfg_sales', firmId: firmId, name: 'Manufacturing Sales', groupType: AccountGroupType.revenue, subGroup: 'Sales Accounts', hsnCode: '6810', gstRate: 18.0, openingBalance: 0, opType: 'Cr'),
      ]);
    } else if (type == FirmType.retail || type == FirmType.trader) {
      accounts.addAll([
        LedgerAccount(id: 'acc_stock_trade', firmId: firmId, name: 'Stock in Trade', groupType: AccountGroupType.asset, subGroup: 'Stock', openingBalance: 0, opType: 'Dr'),
        LedgerAccount(id: 'acc_retail_sales', firmId: firmId, name: 'Trading Sales Revenue', groupType: AccountGroupType.revenue, subGroup: 'Sales Accounts', hsnCode: '2710', gstRate: 18.0, openingBalance: 0, opType: 'Cr'),
      ]);
    } else if (type == FirmType.service) {
      accounts.addAll([
        LedgerAccount(id: 'acc_service_income', firmId: firmId, name: 'Professional Service Revenue', groupType: AccountGroupType.revenue, subGroup: 'Services', hsnCode: '9983', gstRate: 18.0, openingBalance: 0, opType: 'Cr'),
      ]);
    }

    _db.put('accounts_$firmId', accounts.map((a) => a.toMap()).toList());
    _db.put('vouchers_$firmId', []);
  }

  @override
  Widget build(BuildContext context) {
    List firms = _db.get('firms_registry', defaultValue: []);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Business / Firm', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1B365D),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: () {
              Hive.box('app_user_session').clear();
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (ctx) => const MobileAuthScreen()));
            },
          )
        ],
      ),
      body: firms.isEmpty
          ? Center(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B365D), foregroundColor: Colors.white),
                onPressed: _showCreateFirmDialog,
                icon: const Icon(Icons.add),
                label: const Text('Create First Business Profile'),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: firms.length,
              itemBuilder: (ctx, i) {
                var f = firms[i];
                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(backgroundColor: Color(0xFF1B365D), child: Icon(Icons.store, color: Colors.white)),
                    title: Text(f['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Category: ${f['firmType'].toString().toUpperCase()} | GST: ${f['gstin']}'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (ctx) => MainErpDashboard(firmData: Map<String, dynamic>.from(f)),
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
              onPressed: _showCreateFirmDialog,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Add Firm', style: TextStyle(color: Colors.white)),
            )
          : null,
    );
  }
}

// ============================================================================
// 5. MAIN ERP WORKSPACE DASHBOARD
// ============================================================================
class MainErpDashboard extends StatefulWidget {
  final Map<String, dynamic> firmData;
  const MainErpDashboard({super.key, required this.firmData});

  @override
  State<MainErpDashboard> createState() => _MainErpDashboardState();
}

class _MainErpDashboardState extends State<MainErpDashboard> {
  int _activeTab = 0;

  @override
  Widget build(BuildContext context) {
    List<Widget> screens = [
      LedgerManagementView(firmId: widget.firmData['id']),
      ProfessionalGstInvoiceView(firmData: widget.firmData),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B365D),
        title: Text(widget.firmData['name'], style: const TextStyle(color: Colors.white)),
      ),
      body: screens[_activeTab],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _activeTab,
        selectedItemColor: const Color(0xFF1B365D),
        onTap: (index) => setState(() => _activeTab = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.account_tree), label: 'Chart of Accounts'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: 'GST Sales Invoice'),
        ],
      ),
    );
  }
}

// ============================================================================
// 6. LEDGER MANAGEMENT (INCLUDES MANUAL LEDGER CREATION)
// ============================================================================
class LedgerManagementView extends StatefulWidget {
  final String firmId;
  const LedgerManagementView({super.key, required this.firmId});

  @override
  State<LedgerManagementView> createState() => _LedgerManagementViewState();
}

class _LedgerManagementViewState extends State<LedgerManagementView> {
  final Box _db = Hive.box('master_accounting_db');

  void _showAddManualLedgerDialog() {
    final nameCtrl = TextEditingController();
    final hsnCtrl = TextEditingController();
    final gstRateCtrl = TextEditingController(text: '18.0');
    final opBalCtrl = TextEditingController(text: '0.0');
    AccountGroupType selectedGroup = AccountGroupType.asset;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Create Custom Manual Ledger'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Account / Party Name *', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                DropdownButtonFormField<AccountGroupType>(
                  value: selectedGroup,
                  decoration: const InputDecoration(labelText: 'Primary Group *', border: OutlineInputBorder()),
                  items: AccountGroupType.values.map((g) => DropdownMenuItem(value: g, child: Text(g.name.toUpperCase()))).toList(),
                  onChanged: (val) => setDlgState(() => selectedGroup = val!),
                ),
                const SizedBox(height: 10),
                TextField(controller: hsnCtrl, decoration: const InputDecoration(labelText: 'HSN / SAC Code', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: gstRateCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'GST Tax Rate (%)', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: opBalCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Opening Balance (₹)', border: OutlineInputBorder())),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B365D), foregroundColor: Colors.white),
              onPressed: () {
                if (nameCtrl.text.trim().isNotEmpty) {
                  List rawAccounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
                  String accId = 'acc_${DateTime.now().millisecondsSinceEpoch}';

                  LedgerAccount customAcc = LedgerAccount(
                    id: accId,
                    firmId: widget.firmId,
                    name: nameCtrl.text.trim(),
                    groupType: selectedGroup,
                    subGroup: 'Custom Manual',
                    hsnCode: hsnCtrl.text.trim(),
                    gstRate: double.tryParse(gstRateCtrl.text) ?? 0.0,
                    openingBalance: double.tryParse(opBalCtrl.text) ?? 0.0,
                    opType: (selectedGroup == AccountGroupType.asset || selectedGroup == AccountGroupType.expense) ? 'Dr' : 'Cr',
                  );

                  rawAccounts.add(customAcc.toMap());
                  _db.put('accounts_${widget.firmId}', rawAccounts);
                  Navigator.pop(ctx);
                  setState(() {});
                }
              },
              child: const Text('Save Ledger'),
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    List rawAccounts = _db.get('accounts_${widget.firmId}', defaultValue: []);
    List<LedgerAccount> accounts = rawAccounts.map((x) => LedgerAccount.fromMap(Map<String, dynamic>.from(x))).toList();

    return Scaffold(
      body: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: accounts.length,
        itemBuilder: (ctx, i) {
          var acc = accounts[i];
          return Card(
            child: ListTile(
              title: Text(acc.name, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${acc.groupType.name.toUpperCase()} | HSN: ${acc.hsnCode ?? "N/A"} | GST: ${acc.gstRate}%'),
              trailing: Text('₹ ${acc.openingBalance.toStringAsFixed(2)} ${acc.opType}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF1B365D),
        onPressed: _showAddManualLedgerDialog,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Manual Custom Account', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}

// ============================================================================
// 7. INDIAN GST TAX INVOICE ENGINE
// ============================================================================
class ProfessionalGstInvoiceView extends StatefulWidget {
  final Map<String, dynamic> firmData;
  const ProfessionalGstInvoiceView({super.key, required this.firmData});

  @override
  State<ProfessionalGstInvoiceView> createState() => _ProfessionalGstInvoiceViewState();
}

class _ProfessionalGstInvoiceViewState extends State<ProfessionalGstInvoiceView> {
  final _customerNameCtrl = TextEditingController();
  final _customerGstinCtrl = TextEditingController();
  final _customerStateCodeCtrl = TextEditingController(text: '08');
  final _itemDescriptionCtrl = TextEditingController();
  final _hsnCtrl = TextEditingController(text: '6810');
  final _qtyCtrl = TextEditingController(text: '1');
  final _rateCtrl = TextEditingController(text: '0.00');
  final double _gstRate = 18.0;

  void _generateInvoice() {
    double qty = double.tryParse(_qtyCtrl.text) ?? 1.0;
    double rate = double.tryParse(_rateCtrl.text) ?? 0.0;
    double taxableValue = qty * rate;

    String supplierState = widget.firmData['stateCode'] ?? '08';
    String customerState = _customerStateCodeCtrl.text.trim();

    bool isIntraState = supplierState == customerState;

    double cgst = 0.0;
    double sgst = 0.0;
    double igst = 0.0;

    if (isIntraState) {
      cgst = taxableValue * (_gstRate / 2) / 100;
      sgst = taxableValue * (_gstRate / 2) / 100;
    } else {
      igst = taxableValue * _gstRate / 100;
    }

    double totalInvoiceAmount = taxableValue + cgst + sgst + igst;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('TAX INVOICE (Indian GST Rules)', style: TextStyle(fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Seller: ${widget.firmData['name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
              Text('GSTIN: ${widget.firmData['gstin']} | State Code: $supplierState'),
              const Divider(),
              Text('Buyer: ${_customerNameCtrl.text}'),
              Text('Buyer GSTIN: ${_customerGstinCtrl.text} | State Code: $customerState'),
              const Divider(),
              Text('Item: ${_itemDescriptionCtrl.text} (HSN: ${_hsnCtrl.text})'),
              Text('Taxable Value: ₹ ${taxableValue.toStringAsFixed(2)}'),
              if (isIntraState) ...[
                Text('CGST (${_gstRate / 2}%): ₹ ${cgst.toStringAsFixed(2)}'),
                Text('SGST (${_gstRate / 2}%): ₹ ${sgst.toStringAsFixed(2)}'),
              ] else ...[
                Text('IGST ($_gstRate%): ₹ ${igst.toStringAsFixed(2)}'),
              ],
              const Divider(),
              Text('Total Invoice Value: ₹ ${totalInvoiceAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1B365D))),
            ],
          ),
        ),
        actions: [
          ElevatedButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close & Print'))
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        child: Column(
          children: [
            const Text('New Professional GST Billing Invoice', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(controller: _customerNameCtrl, decoration: const InputDecoration(labelText: 'Customer/Party Name *', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _customerGstinCtrl, decoration: const InputDecoration(labelText: 'Customer GSTIN', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _customerStateCodeCtrl, decoration: const InputDecoration(labelText: 'Customer State Code (e.g. 08)', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _itemDescriptionCtrl, decoration: const InputDecoration(labelText: 'Item Description / Goods Name', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: TextField(controller: _hsnCtrl, decoration: const InputDecoration(labelText: 'HSN/SAC Code', border: OutlineInputBorder()))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: _qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity', border: OutlineInputBorder()))),
              ],
            ),
            const SizedBox(height: 10),
            TextField(controller: _rateCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Unit Rate Price (₹)', border: OutlineInputBorder())),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1B365D), foregroundColor: Colors.white),
                onPressed: _generateInvoice,
                icon: const Icon(Icons.print),
                label: const Text('Generate GST Tax Invoice'),
              ),
            )
          ],
        ),
      ),
    );
  }
}
