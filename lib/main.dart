import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('global_accounting_box');
  runApp(const ProAccountingApp());
}

class ProAccountingApp extends StatelessWidget {
  const ProAccountingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Professional Accounting',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF0D47A1),
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0D47A1)),
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
  final Box _box = Hive.box('global_accounting_box');

  void _showAddFirmDialog() {
    final nameCtrl = TextEditingController();
    final gstCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create New Firm / Business'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Firm Name *', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: gstCtrl, decoration: const InputDecoration(labelText: 'GSTIN / Reg No.', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                String firmId = DateTime.now().millisecondsSinceEpoch.toString();
                List firms = _box.get('firms_list', defaultValue: []);
                firms.add({
                  'id': firmId,
                  'name': nameCtrl.text,
                  'gst': gstCtrl.text,
                });
                _box.put('firms_list', firms);
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

  @override
  Widget build(BuildContext context) {
    List firms = _box.get('firms_list', defaultValue: []);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D47A1),
        title: const Text('Select Firm / Business', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: firms.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.business, size: 70, color: Colors.grey),
                  const SizedBox(height: 12),
                  const Text('Koi Firm bani hui nahi hai', style: TextStyle(fontSize: 16, color: Colors.grey, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D47A1), foregroundColor: Colors.white),
                    onPressed: _showAddFirmDialog,
                    icon: const Icon(Icons.add),
                    label: const Text('Create First Firm'),
                  )
                ],
              ),
            )
          : ListView.builder(
              itemCount: firms.length,
              itemBuilder: (ctx, idx) {
                var firm = firms[idx];
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFF0D47A1),
                      child: Icon(Icons.store, color: Colors.white),
                    ),
                    title: Text(firm['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    subtitle: Text('GSTIN: ${firm['gst'].isEmpty ? "N/A" : firm['gst']}'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (ctx) => FirmWorkspaceScreen(firmId: firm['id'], firmName: firm['name']),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
      floatingActionButton: firms.isNotEmpty
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF0D47A1),
              onPressed: _showAddFirmDialog,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Add Firm', style: TextStyle(color: Colors.white)),
            )
          : null,
    );
  }
}

// ============================================================================
// 2. FIRM WORKSPACE (Dashboard for Specific Firm)
// ============================================================================
class FirmWorkspaceScreen extends StatelessWidget {
  final String firmId;
  final String firmName;
  const FirmWorkspaceScreen({super.key, required this.firmId, required this.firmName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D47A1),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(firmName, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const Text('Professional Accounting Workspace', style: TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        children: [
          _menuCard(context, 'Parties / Ledgers', Icons.people, Colors.indigo, () {
            Navigator.push(context, MaterialPageRoute(builder: (ctx) => PartyLedgerScreen(firmId: firmId)));
          }),
          _menuCard(context, 'Sales Invoices', Icons.receipt_long, Colors.green, () {
            Navigator.push(context, MaterialPageRoute(builder: (ctx) => SalesBillingScreen(firmId: firmId)));
          }),
        ],
      ),
    );
  }

  Widget _menuCard(BuildContext context, String title, IconData icon, Color color, VoidCallback onTap) {
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
              Text(title, textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// 3. PARTY LEDGER MANAGEMENT MODULE
// ============================================================================
class PartyLedgerScreen extends StatefulWidget {
  final String firmId;
  const PartyLedgerScreen({super.key, required this.firmId});

  @override
  State<PartyLedgerScreen> createState() => _PartyLedgerScreenState();
}

class _PartyLedgerScreenState extends State<PartyLedgerScreen> {
  final Box _box = Hive.box('global_accounting_box');

  void _showAddPartyDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add New Party / Customer'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Party Name *', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Mobile Number', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                List allParties = _box.get('parties_${widget.firmId}', defaultValue: []);
                allParties.add({
                  'name': nameCtrl.text,
                  'phone': phoneCtrl.text,
                  'balance': 0.0,
                  'txs': [],
                });
                _box.put('parties_${widget.firmId}', allParties);
                Navigator.pop(ctx);
                setState(() {});
              }
            },
            child: const Text('Save'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    List parties = _box.get('parties_${widget.firmId}', defaultValue: []);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D47A1),
        title: const Text('Parties & Accounts Ledger', style: TextStyle(color: Colors.white)),
      ),
      body: parties.isEmpty
          ? const Center(child: Text('Koi Party add nahi hai.'))
          : ListView.builder(
              itemCount: parties.length,
              itemBuilder: (ctx, i) {
                var p = parties[i];
                double bal = (p['balance'] ?? 0.0).toDouble();
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  child: ListTile(
                    title: Text(p['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(p['phone']),
                    trailing: Text(
                      '₹ ${bal.abs()} ${bal >= 0 ? "Dr" : "Cr"}',
                      style: TextStyle(fontWeight: FontWeight.bold, color: bal >= 0 ? Colors.green : Colors.red),
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF0D47A1),
        onPressed: _showAddPartyDialog,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('Add Party', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}

// ============================================================================
// 4. SALES BILLING SYSTEM MODULE
// ============================================================================
class SalesBillingScreen extends StatefulWidget {
  final String firmId;
  const SalesBillingScreen({super.key, required this.firmId});

  @override
  State<SalesBillingScreen> createState() => _SalesBillingScreenState();
}

class _SalesBillingScreenState extends State<SalesBillingScreen> {
  final Box _box = Hive.box('global_accounting_box');

  void _showCreateBillDialog() {
    final itemCtrl = TextEditingController();
    final amountCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create Sales Invoice'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: itemCtrl, decoration: const InputDecoration(labelText: 'Item / Service Name *', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: amountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total Amount (₹) *', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              double amt = double.tryParse(amountCtrl.text) ?? 0;
              if (itemCtrl.text.isNotEmpty && amt > 0) {
                List bills = _box.get('bills_${widget.firmId}', defaultValue: []);
                bills.add({
                  'item': itemCtrl.text,
                  'amount': amt,
                  'date': DateTime.now().toString().substring(0, 10),
                });
                _box.put('bills_${widget.firmId}', bills);
                Navigator.pop(ctx);
                setState(() {});
              }
            },
            child: const Text('Generate Bill'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    List bills = _box.get('bills_${widget.firmId}', defaultValue: []);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D47A1),
        title: const Text('Sales Invoices / Billing', style: TextStyle(color: Colors.white)),
      ),
      body: bills.isEmpty
          ? const Center(child: Text('Koi Sales Bill nahi bana hai.'))
          : ListView.builder(
              itemCount: bills.length,
              itemBuilder: (ctx, i) {
                var b = bills[i];
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  child: ListTile(
                    title: Text(b['item'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Date: ${b['date']}'),
                    trailing: Text('₹ ${b['amount']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.green)),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF0D47A1),
        onPressed: _showCreateBillDialog,
        icon: const Icon(Icons.receipt, color: Colors.white),
        label: const Text('New Invoice', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
