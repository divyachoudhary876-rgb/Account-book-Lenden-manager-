import 'package:flutter/material.dart';

void main() {
  runApp(const AccountingApp());
}

class AccountingApp extends StatelessWidget {
  const AccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pro Business Accountant',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.indigo,
        useMaterial3: true,
      ),
      home: const MainDashboard(),
    );
  }
}

enum EntryType { debit, credit } // Debit = Cash In/Receivable, Credit = Cash Out/Payable

class JournalEntry {
  final String id;
  final String partyName;
  final String accountCategory;
  final double amount;
  final EntryType type;
  final String narration;

  JournalEntry({
    required this.id,
    required this.partyName,
    required this.accountCategory,
    required this.amount,
    required this.type,
    required this.narration,
  });
}

class MainDashboard extends StatefulWidget {
  const MainDashboard({super.key});

  @override
  State<MainDashboard> createState() => _MainDashboardState();
}

class _MainDashboardState extends State<MainDashboard> {
  int _selectedIndex = 0;
  final List<JournalEntry> _journal = [];

  double get totalReceivable => _journal
      .where((e) => e.type == EntryType.debit)
      .fold(0.0, (sum, e) => sum + e.amount);

  double get totalPayable => _journal
      .where((e) => e.type == EntryType.credit)
      .fold(0.0, (sum, e) => sum + e.amount);

  double get netCashBalance => totalReceivable - totalPayable;

  void _addJournalEntry(JournalEntry entry) {
    setState(() {
      _journal.add(entry);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _buildDashboardView(),
      _buildLedgerView(),
      _buildBillingView(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pro Business Accountant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.indigo.shade900,
      ),
      body: pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.menu_book), label: 'Ledger Book'),
          NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Create Bill'),
        ],
      ),
    );
  }

  Widget _buildDashboardView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Financial Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildSummaryCard('Receivable (Dr)', '₹ ${totalReceivable.toStringAsFixed(2)}', Colors.green),
              const SizedBox(width: 12),
              _buildSummaryCard('Payable (Cr)', '₹ ${totalPayable.toStringAsFixed(2)}', Colors.red),
            ],
          ),
          const SizedBox(height: 12),
          _buildSummaryCard('Net Working Balance', '₹ ${netCashBalance.toStringAsFixed(2)}', Colors.indigo, isFullWidth: true),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Voucher Entries', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ElevatedButton.icon(
                onPressed: () => _showNewVoucherDialog(context),
                icon: const Icon(Icons.add),
                label: const Text('New Entry'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white),
              )
            ],
          ),
          const SizedBox(height: 12),
          _journal.isEmpty
              ? const Center(child: Padding(padding: EdgeInsets.all(32.0), child: Text('No Entries Recorded Yet.')))
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _journal.length,
                  itemBuilder: (ctx, i) {
                    final e = _journal.reversed.toList()[i];
                    final isDebit = e.type == EntryType.debit;
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isDebit ? Colors.green.shade100 : Colors.red.shade100,
                          child: Icon(isDebit ? Icons.arrow_downward : Icons.arrow_upward, color: isDebit ? Colors.green : Colors.red),
                        ),
                        title: Text(e.partyName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${e.accountCategory}\nNote: ${e.narration}'),
                        trailing: Text(
                          '${isDebit ? "Dr" : "Cr"} ₹${e.amount.toStringAsFixed(2)}',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: isDebit ? Colors.green.shade800 : Colors.red.shade800),
                        ),
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  Widget _buildLedgerView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('General Ledger Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            title: const Text('Pathai & Labour Expenses'),
            subtitle: const Text('Direct Expense Account'),
            trailing: Text('₹ ${_calculateCategoryTotal("Pathai Majdoori")}', style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text('Raw Material & Fuel (Koyla)'),
            subtitle: const Text('Direct Expense Account'),
            trailing: Text('₹ ${_calculateCategoryTotal("Koyla Kharid")}', style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text('Transport & Freight Account'),
            subtitle: const Text('Expense Account'),
            trailing: Text('₹ ${_calculateCategoryTotal("Transport")}', style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text('Sales & Revenue Account'),
            subtitle: const Text('Income Account'),
            trailing: Text('₹ ${_calculateCategoryTotal("Customer Sales")}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
          ),
        ),
      ],
    );
  }

  Widget _buildBillingView() {
    final partyController = TextEditingController();
    final itemController = TextEditingController();
    final rateController = TextEditingController();
    final qtyController = TextEditingController();

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Create Business Bill / Invoice', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(controller: partyController, decoration: const InputDecoration(labelText: 'Customer Name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: itemController, decoration: const InputDecoration(labelText: 'Item Description (e.g., Eent - 1st Class)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextField(controller: qtyController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity', border: OutlineInputBorder()))),
                const SizedBox(width: 12),
                Expanded(child: TextField(controller: rateController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Rate (₹)', border: OutlineInputBorder()))),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white),
                onPressed: () {
                  double qty = double.tryParse(qtyController.text) ?? 0;
                  double rate = double.tryParse(rateController.text) ?? 0;
                  double total = qty * rate;

                  if (partyController.text.isNotEmpty && total > 0) {
                    _addJournalEntry(JournalEntry(
                      id: DateTime.now().millisecondsSinceEpoch.toString(),
                      partyName: partyController.text,
                      accountCategory: 'Customer Sales',
                      amount: total,
                      type: EntryType.debit,
                      narration: 'Bill: ${itemController.text} (Qty: $qty @ ₹$rate)',
                    ));

                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Invoice Recorded! Total Amount: ₹$total')),
                    );

                    partyController.clear();
                    itemController.clear();
                    qtyController.clear();
                    rateController.clear();
                    setState(() => _selectedIndex = 0);
                  }
                },
                icon: const Icon(Icons.receipt),
                label: const Text('Save & Post Bill to Ledger', style: TextStyle(fontSize: 16)),
              ),
            )
          ],
        ),
      ),
    );
  }

  String _calculateCategoryTotal(String cat) {
    return _journal
        .where((e) => e.accountCategory == cat)
        .fold(0.0, (sum, e) => sum + e.amount)
        .toStringAsFixed(2);
  }

  Widget _buildSummaryCard(String title, String amount, Color color, {bool isFullWidth = false}) {
    Widget card = Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(amount, style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );

    return isFullWidth ? SizedBox(width: double.infinity, child: card) : Expanded(child: card);
  }

  void _showNewVoucherDialog(BuildContext context) {
    String party = '';
    String category = 'Pathai Majdoori';
    String amount = '';
    String narration = '';
    EntryType type = EntryType.debit;

    final categories = ['Pathai Majdoori', 'Koyla Kharid', 'Transport', 'Customer Sales', 'Other Expense'];

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDlgState) {
            return AlertDialog(
              title: const Text('Create Voucher Entry'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(decoration: const InputDecoration(labelText: 'Party / Account Name'), onChanged: (v) => party = v),
                    DropdownButtonFormField<String>(
                      value: category,
                      items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) => setDlgState(() => category = v!),
                      decoration: const InputDecoration(labelText: 'Account Category'),
                    ),
                    TextField(decoration: const InputDecoration(labelText: 'Amount (₹)'), keyboardType: TextInputType.number, onChanged: (v) => amount = v),
                    TextField(decoration: const InputDecoration(labelText: 'Narration / Detail'), onChanged: (v) => narration = v),
                    const SizedBox(height: 10),
                    SegmentedButton<EntryType>(
                      segments: const [
                        ButtonSegment(value: EntryType.debit, label: Text('Debit (Dr)')),
                        ButtonSegment(value: EntryType.credit, label: Text('Credit (Cr)')),
                      ],
                      selected: {type},
                      onSelectionChanged: (set) => setDlgState(() => type = set.first),
                    )
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () {
                    if (party.isNotEmpty && amount.isNotEmpty) {
                      _addJournalEntry(JournalEntry(
                        id: DateTime.now().millisecondsSinceEpoch.toString(),
                        partyName: party,
                        accountCategory: category,
                        amount: double.tryParse(amount) ?? 0.0,
                        type: type,
                        narration: narration,
                      ));
                      Navigator.pop(ctx);
                    }
                  },
                  child: const Text('Post Voucher'),
                )
              ],
            );
          },
        );
      },
    );
  }
}
