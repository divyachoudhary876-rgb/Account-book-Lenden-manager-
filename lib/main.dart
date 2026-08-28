import 'package:flutter/material.dart';

void main() {
  runApp(const UniversalAccountingApp());
}

class UniversalAccountingApp extends StatelessWidget {
  const UniversalAccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Universal Business Accountant',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.teal,
          primary: const Color(0xFF0F5257),
          secondary: const Color(0xFF0B6E4F),
        ),
        cardTheme: CardTheme(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      home: const OnboardingScreen(),
    );
  }
}

// ============================================================================
// DATA MODELS & ENUMS
// ============================================================================

enum BusinessCategory { manufacturing, retail, wholesale, services, construction, agriculture }

enum AccountNature { asset, liability, equity, revenue, expense }

enum EntryType { debit, credit }

class LedgerAccount {
  final String id;
  String name;
  AccountNature nature;
  bool isCustom;

  LedgerAccount({
    required this.id,
    required this.name,
    required this.nature,
    this.isCustom = false,
  });
}

class TransactionEntry {
  final String id;
  final String partyName;
  final String accountId;
  final double amount;
  final EntryType type;
  final String narration;
  final DateTime timestamp;

  TransactionEntry({
    required this.id,
    required this.partyName,
    required this.accountId,
    required this.amount,
    required this.type,
    required this.narration,
    required this.timestamp,
  });
}

// ============================================================================
// STATE MANAGEMENT & APP ARCHITECTURE
// ============================================================================

class AppState {
  static BusinessCategory selectedBusiness = BusinessCategory.retail;
  static List<LedgerAccount> chartOfAccounts = [];
  static List<TransactionEntry> dayBook = [];

  static void initializeChartOfAccounts(BusinessCategory category) {
    selectedBusiness = category;
    chartOfAccounts.clear();

    switch (category) {
      case BusinessCategory.manufacturing:
        chartOfAccounts.addAll([
          LedgerAccount(id: '1', name: 'Pathai / Labour Wages', nature: AccountNature.expense),
          LedgerAccount(id: '2', name: 'Coal / Fuel Purchase', nature: AccountNature.expense),
          LedgerAccount(id: '3', name: 'Freight & Transport', nature: AccountNature.expense),
          LedgerAccount(id: '4', name: 'Manufactured Goods Sales', nature: AccountNature.revenue),
        ]);
        break;
      case BusinessCategory.retail:
        chartOfAccounts.addAll([
          LedgerAccount(id: '1', name: 'Inventory Purchase', nature: AccountNature.expense),
          LedgerAccount(id: '2', name: 'Counter Sales Revenue', nature: AccountNature.revenue),
          LedgerAccount(id: '3', name: 'Store Rent Expense', nature: AccountNature.expense),
          LedgerAccount(id: '4', name: 'Electricity & Utilities', nature: AccountNature.expense),
        ]);
        break;
      case BusinessCategory.wholesale:
        chartOfAccounts.addAll([
          LedgerAccount(id: '1', name: 'Bulk Stock Procurement', nature: AccountNature.expense),
          LedgerAccount(id: '2', name: 'Wholesale Sales Revenue', nature: AccountNature.revenue),
          LedgerAccount(id: '3', name: 'Logistics & Warehousing', nature: AccountNature.expense),
        ]);
        break;
      case BusinessCategory.services:
        chartOfAccounts.addAll([
          LedgerAccount(id: '1', name: 'Professional Fee Revenue', nature: AccountNature.revenue),
          LedgerAccount(id: '2', name: 'Software Subscriptions', nature: AccountNature.expense),
          LedgerAccount(id: '3', name: 'Office Expense', nature: AccountNature.expense),
        ]);
        break;
      case BusinessCategory.construction:
        chartOfAccounts.addAll([
          LedgerAccount(id: '1', name: 'Raw Material Expenses', nature: AccountNature.expense),
          LedgerAccount(id: '2', name: 'Subcontractor Costs', nature: AccountNature.expense),
          LedgerAccount(id: '3', name: 'Project Milestone Billing', nature: AccountNature.revenue),
        ]);
        break;
      case BusinessCategory.agriculture:
        chartOfAccounts.addAll([
          LedgerAccount(id: '1', name: 'Seeds & Fertilizer Purchase', nature: AccountNature.expense),
          LedgerAccount(id: '2', name: 'Crop Sales Revenue', nature: AccountNature.revenue),
          LedgerAccount(id: '3', name: 'Equipment Maintenance', nature: AccountNature.expense),
        ]);
        break;
    }
    
    // Default Global Ledgers
    chartOfAccounts.addAll([
      LedgerAccount(id: '100', name: 'Cash Account', nature: AccountNature.asset),
      LedgerAccount(id: '101', name: 'Accounts Receivable', nature: AccountNature.asset),
      LedgerAccount(id: '102', name: 'Accounts Payable', nature: AccountNature.liability),
    ]);
  }

  static String getAccountingGuidance(EntryType type, AccountNature nature) {
    if (type == EntryType.debit) {
      switch (nature) {
        case AccountNature.asset:
          return 'Debit Rule (Real Account): Debit what comes in / Increase in Assets.';
        case AccountNature.expense:
          return 'Debit Rule (Nominal Account): Debit all expenses and losses.';
        case AccountNature.liability:
          return 'Debit Rule (Personal Account): Debit the receiver / Decrease in Liabilities.';
        case AccountNature.revenue:
          return 'Debit Rule: Reduction in recognized Revenue.';
        case AccountNature.equity:
          return 'Debit Rule: Reduction in Owner Capital.';
      }
    } else {
      switch (nature) {
        case AccountNature.asset:
          return 'Credit Rule (Real Account): Credit what goes out / Decrease in Assets.';
        case AccountNature.expense:
          return 'Credit Rule: Reduction in recorded Expenses.';
        case AccountNature.liability:
          return 'Credit Rule (Personal Account): Credit the giver / Increase in Liabilities.';
        case AccountNature.revenue:
          return 'Credit Rule (Nominal Account): Credit all incomes and gains.';
        case AccountNature.equity:
          return 'Credit Rule: Increase in Equity/Capital.';
      }
    }
  }
}

// ============================================================================
// 1. BUSINESS ONBOARDING SCREEN
// ============================================================================

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  BusinessCategory _selected = BusinessCategory.retail;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Business Setup', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAlignment.start,
          children: [
            const Text(
              'Select Your Business Category',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'We will automatically configure your Chart of Accounts with industry-standard ledgers.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView(
                children: BusinessCategory.values.map((cat) {
                  final title = cat.name[0].toUpperCase() + cat.name.substring(1);
                  return Card(
                    child: RadioListTile<BusinessCategory>(
                      value: cat,
                      groupValue: _selected,
                      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(_getCategoryDescription(cat)),
                      onChanged: (val) => setState(() => _selected = val!),
                    ),
                  );
                }).toList(),
              ),
            ),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                ),
                onPressed: () {
                  AppState.initializeChartOfAccounts(_selected);
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (ctx) => const MainNavigationScreen()),
                  );
                },
                child: const Text('Initialize Chart of Accounts', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getCategoryDescription(BusinessCategory cat) {
    switch (cat) {
      case BusinessCategory.manufacturing:
        return 'Brick kilns, production units, and raw material processing.';
      case BusinessCategory.retail:
        return 'Grocery stores, apparel shops, and consumer sales.';
      case BusinessCategory.wholesale:
        return 'B2B distribution, bulk sales, and supply chains.';
      case BusinessCategory.services:
        return 'Consultancies, IT services, and freelance work.';
      case BusinessCategory.construction:
        return 'Contracting, infrastructure, and real estate development.';
      case BusinessCategory.agriculture:
        return 'Farming, crop sales, and agricultural inputs.';
    }
  }
}

// ============================================================================
// MAIN CONTAINER & NAVIGATION
// ============================================================================

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    DashboardView(),
    ChartOfAccountsView(),
    InvoicingView(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), selectedIcon: Icon(Icons.account_balance_wallet), label: 'Ledgers'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Invoicing'),
        ],
      ),
    );
  }
}

// ============================================================================
// 5. DASHBOARD & FINANCIAL REPORTS VIEW
// ============================================================================

class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  double get totalReceivables => AppState.dayBook
      .where((e) => e.type == EntryType.debit)
      .fold(0.0, (sum, e) => sum + e.amount);

  double get totalPayables => AppState.dayBook
      .where((e) => e.type == EntryType.credit)
      .fold(0.0, (sum, e) => sum + e.amount);

  double get netCashBalance => totalReceivables - totalPayables;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Financial Dashboard', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAlignment.start,
          children: [
            const Text('Executive Financial Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildMetricCard('Receivables (Dr)', '₹ ${totalReceivables.toStringAsFixed(2)}', Colors.green),
                const SizedBox(width: 12),
                _buildMetricCard('Payables (Cr)', '₹ ${totalPayables.toStringAsFixed(2)}', Colors.red),
              ],
            ),
            const SizedBox(height: 12),
            _buildMetricCard('Net Working Capital', '₹ ${netCashBalance.toStringAsFixed(2)}', Colors.teal, isFullWidth: true),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Day Book / Journal Entries', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ElevatedButton.icon(
                  onPressed: () async {
                    await _showNewVoucherDialog(context);
                    setState(() {});
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('New Entry'),
                )
              ],
            ),
            const SizedBox(height: 12),
            AppState.dayBook.isEmpty
                ? const Card(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Center(child: Text('No Journal Entries Recorded Yet.')),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: AppState.dayBook.length,
                    itemBuilder: (context, i) {
                      final entry = AppState.dayBook.reversed.toList()[i];
                      final isDebit = entry.type == EntryType.debit;
                      final account = AppState.chartOfAccounts.firstWhere(
                        (a) => a.id == entry.accountId,
                        orElse: () => LedgerAccount(id: '0', name: 'General Account', nature: AccountNature.asset),
                      );

                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: isDebit ? Colors.green.shade100 : Colors.red.shade100,
                            child: Icon(isDebit ? Icons.arrow_downward : Icons.arrow_upward, color: isDebit ? Colors.green : Colors.red),
                          ),
                          title: Text(entry.partyName, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('Account: ${account.name}\nNarration: ${entry.narration}'),
                          trailing: Text(
                            '${isDebit ? "Dr" : "Cr"} ₹${entry.amount.toStringAsFixed(2)}',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: isDebit ? Colors.green.shade800 : Colors.red.shade800),
                          ),
                        ),
                      );
                    },
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(String title, String amount, Color color, {bool isFullWidth = false}) {
    Widget card = Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(amount, style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );

    return isFullWidth ? SizedBox(width: double.infinity, child: card) : Expanded(child: card);
  }

  // ============================================================================
  // 3. ACCOUNTING RULE GUIDANCE & SMART SUGGESTIONS (VOUCHER DIALOG)
  // ============================================================================

  Future<void> _showNewVoucherDialog(BuildContext context) async {
    final partyCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final narrationCtrl = TextEditingController();
    
    LedgerAccount selectedAccount = AppState.chartOfAccounts.first;
    EntryType selectedType = EntryType.debit;

    return showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDlgState) {
            String ruleGuidance = AppState.getAccountingGuidance(selectedType, selectedAccount.nature);

            return AlertDialog(
              title: const Text('Post Journal Voucher'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAlignment.start,
                  children: [
                    TextField(
                      controller: partyCtrl,
                      decoration: const InputDecoration(labelText: 'Party / Account Entity', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<LedgerAccount>(
                      value: selectedAccount,
                      decoration: const InputDecoration(labelText: 'Chart of Account Ledger', border: OutlineInputBorder()),
                      items: AppState.chartOfAccounts.map((acc) {
                        return DropdownMenuItem(value: acc, child: Text('${acc.name} (${acc.nature.name.toUpperCase()})'));
                      }).toList(),
                      onChanged: (val) {
                        setDlgState(() => selectedAccount = val!);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: amountCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Amount (₹)', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: narrationCtrl,
                      decoration: const InputDecoration(labelText: 'Transaction Narration', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 16),
                    const Text('Posting Type:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    SegmentedButton<EntryType>(
                      segments: const [
                        ButtonSegment(value: EntryType.debit, label: Text('Debit (Dr)')),
                        ButtonSegment(value: EntryType.credit, label: Text('Credit (Cr)')),
                      ],
                      selected: {selectedType},
                      onSelectionChanged: (set) {
                        setDlgState(() => selectedType = set.first);
                      },
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.lightbulb_outline, size: 18, color: Colors.blue),
                              SizedBox(width: 6),
                              Text('Smart Accounting Rule Suggestion', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(ruleGuidance, style: const TextStyle(fontSize: 12, color: Colors.black87)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () {
                    if (partyCtrl.text.isNotEmpty && amountCtrl.text.isNotEmpty) {
                      AppState.dayBook.add(TransactionEntry(
                        id: DateTime.now().millisecondsSinceEpoch.toString(),
                        partyName: partyCtrl.text,
                        accountId: selectedAccount.id,
                        amount: double.tryParse(amountCtrl.text) ?? 0.0,
                        type: selectedType,
                        narration: narrationCtrl.text,
                        timestamp: DateTime.now(),
                      ));
                      Navigator.pop(ctx);
                    }
                  },
                  child: const Text('Post Entry'),
                )
              ],
            );
          },
        );
      },
    );
  }
}

// ============================================================================
// 2. LEDGER CUSTOMIZATION & EDITING VIEW
// ============================================================================

class ChartOfAccountsView extends StatefulWidget {
  const ChartOfAccountsView({super.key});

  @override
  State<ChartOfAccountsView> createState() => _ChartOfAccountsViewState();
}

class _ChartOfAccountsViewState extends State<ChartOfAccountsView> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chart of Accounts', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: AppState.chartOfAccounts.length,
        itemBuilder: (context, index) {
          final account = AppState.chartOfAccounts[index];
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                child: Text(account.nature.name[0].toUpperCase()),
              ),
              title: Text(account.name, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Account Nature: ${account.nature.name.toUpperCase()}'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit, color: Colors.blue),
                    onPressed: () => _showEditLedgerDialog(account),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red),
                    onPressed: () {
                      setState(() {
                        AppState.chartOfAccounts.removeAt(index);
                      });
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddLedgerDialog,
        icon: const Icon(Icons.add),
        label: const Text('Add Custom Ledger'),
      ),
    );
  }

  void _showAddLedgerDialog() {
    final nameCtrl = TextEditingController();
    AccountNature selectedNature = AccountNature.expense;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Add Custom Ledger Account'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Ledger Category Name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<AccountNature>(
                value: selectedNature,
                decoration: const InputDecoration(labelText: 'Account Nature', border: OutlineInputBorder()),
                items: AccountNature.values.map((n) {
                  return DropdownMenuItem(value: n, child: Text(n.name.toUpperCase()));
                }).toList(),
                onChanged: (val) => setDlgState(() => selectedNature = val!),
              )
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (nameCtrl.text.isNotEmpty) {
                  setState(() {
                    AppState.chartOfAccounts.add(LedgerAccount(
                      id: DateTime.now().millisecondsSinceEpoch.toString(),
                      name: nameCtrl.text,
                      nature: selectedNature,
                      isCustom: true,
                    ));
                  });
                  Navigator.pop(ctx);
                }
              },
              child: const Text('Save Ledger'),
            )
          ],
        ),
      ),
    );
  }

  void _showEditLedgerDialog(LedgerAccount account) {
    final nameCtrl = TextEditingController(text: account.name);
    AccountNature selectedNature = account.nature;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Edit Ledger Account'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Ledger Category Name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<AccountNature>(
                value: selectedNature,
                decoration: const InputDecoration(labelText: 'Account Nature', border: OutlineInputBorder()),
                items: AccountNature.values.map((n) {
                  return DropdownMenuItem(value: n, child: Text(n.name.toUpperCase()));
                }).toList(),
                onChanged: (val) => setDlgState(() => selectedNature = val!),
              )
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (nameCtrl.text.isNotEmpty) {
                  setState(() {
                    account.name = nameCtrl.text;
                    account.nature = selectedNature;
                  });
                  Navigator.pop(ctx);
                }
              },
              child: const Text('Update'),
            )
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 4. MULTI-GST INVOICING & BILLING MODULE
// ============================================================================

class InvoicingView extends StatefulWidget {
  const InvoicingView({super.key});

  @override
  State<InvoicingView> createState() => _InvoicingViewState();
}

class _InvoicingViewState extends State<InvoicingView> {
  final _customerNameController = TextEditingController();
  final _itemNameController = TextEditingController();
  final _hsnController = TextEditingController();
  final _quantityController = TextEditingController();
  final _rateController = TextEditingController();

  double _selectedGstSlab = 18.0; // Standard GST percentages: 0, 5, 12, 18, 28
  bool _isInterState = false; // False = Intra-State (CGST+SGST), True = Inter-State (IGST)

  double get subtotal {
    double qty = double.tryParse(_quantityController.text) ?? 0.0;
    double rate = double.tryParse(_rateController.text) ?? 0.0;
    return qty * rate;
  }

  double get taxAmount => subtotal * (_selectedGstSlab / 100);
  double get grandTotal => subtotal + taxAmount;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Multi-GST Tax Invoicing', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            crossAlignment: CrossAlignment.start,
            children: [
              const Text('Customer & Invoice Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: _customerNameController,
                decoration: const InputDecoration(labelText: 'Customer Legal Name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _itemNameController,
                      decoration: const InputDecoration(labelText: 'Item Description', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _hsnController,
                      decoration: const InputDecoration(labelText: 'HSN / SAC Code', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity', border: OutlineInputBorder()),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _rateController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Unit Rate (₹)', border: OutlineInputBorder()),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<double>(
                      value: _selectedGstSlab,
                      decoration: const InputDecoration(labelText: 'GST Tax Slab', border: OutlineInputBorder()),
                      items: [0.0, 5.0, 12.0, 18.0, 28.0].map((slab) {
                        return DropdownMenuItem(value: slab, child: Text('$slab% GST'));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedGstSlab = val!),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SwitchListTile(
                      title: Text(_isInterState ? 'IGST (Inter-State)' : 'CGST+SGST (Intra)'),
                      value: _isInterState,
                      onChanged: (val) => setState(() => _isInterState = val),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Card(
                color: Colors.grey.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      _buildSummaryRow('Subtotal Amount', '₹ ${subtotal.toStringAsFixed(2)}'),
                      if (!_isInterState) ...[
                        _buildSummaryRow('CGST (${_selectedGstSlab / 2}%)', '₹ ${(taxAmount / 2).toStringAsFixed(2)}'),
                        _buildSummaryRow('SGST (${_selectedGstSlab / 2}%)', '₹ ${(taxAmount / 2).toStringAsFixed(2)}'),
                      ] else ...[
                        _buildSummaryRow('IGST ($_selectedGstSlab%)', '₹ ${taxAmount.toStringAsFixed(2)}'),
                      ],
                      const Divider(),
                      _buildSummaryRow('Grand Total Payable', '₹ ${grandTotal.toStringAsFixed(2)}', isBold: true),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: _postInvoiceToLedger,
                  icon: const Icon(Icons.check_circle),
                  label: const Text('Generate Invoice & Post to Ledger', style: TextStyle(fontSize: 16)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal, fontSize: isBold ? 16 : 14)),
          Text(value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal, fontSize: isBold ? 16 : 14)),
        ],
      ),
    );
  }

  void _postInvoiceToLedger() {
    if (_customerNameController.text.isEmpty || grandTotal <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill valid customer details and item quantities.')),
      );
      return;
    }

    // Auto-Post Double Entry to Journal Day Book
    // 1. Debit Customer Receivable
    AppState.dayBook.add(TransactionEntry(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      partyName: _customerNameController.text,
      accountId: '101', // Accounts Receivable Ledger
      amount: grandTotal,
      type: EntryType.debit,
      narration: 'Invoice Bill generated for ${_itemNameController.text} (HSN: ${_hsnController.text})',
      timestamp: DateTime.now(),
    ));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Invoice posted successfully! Amount ₹${grandTotal.toStringAsFixed(2)} recorded.')),
    );

    // Reset Form
    _customerNameController.clear();
    _itemNameController.clear();
    _hsnController.clear();
    _quantityController.clear();
    _rateController.clear();
    setState(() {});
  }
}
