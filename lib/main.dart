import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Phone me Local Database initialize ho raha hai
  await Hive.initFlutter();
  await Hive.openBox('khatabook_box');
  runApp(const SafeKhatabookApp());
}

class SafeKhatabookApp extends StatelessWidget {
  const SafeKhatabookApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Permanent Ledger App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(primarySwatch: Colors.teal, useMaterial3: true),
      home: const LedgerHomeScreen(),
    );
  }
}

class LedgerHomeScreen extends StatefulWidget {
  const LedgerHomeScreen({super.key});

  @override
  State<LedgerHomeScreen> createState() => _LedgerHomeScreenState();
}

class _LedgerHomeScreenState extends State<LedgerHomeScreen> {
  final Box _myBox = Hive.box('khatabook_box');
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();

  // Data Save karne ka function (Permanent Storage)
  void _addTransaction(String type) {
    final name = _nameController.text;
    final amount = double.tryParse(_amountController.text) ?? 0.0;

    if (name.isNotEmpty && amount > 0) {
      final newEntry = {
        'name': name,
        'amount': amount,
        'type': type, // 'GAVE' (Udhaar) ya 'GOT' (Jama)
        'date': DateTime.now().toString().substring(0, 10),
      };

      List history = _myBox.get('transactions', defaultValue: []);
      history.add(newEntry);
      
      // Permanent phone storage me write ho raha hai
      _myBox.put('transactions', history);

      _nameController.clear();
      _amountController.clear();
      Navigator.pop(context);
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    List history = _myBox.get('transactions', defaultValue: []);
    
    double totalGave = 0;
    double totalGot = 0;

    for (var item in history) {
      if (item['type'] == 'GAVE') {
        totalGave += item['amount'];
      } else {
        totalGot += item['amount'];
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Safe Khatabook', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.teal,
      ),
      body: Column(
        children: [
          // Total Balance Card
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.teal.shade50,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('Aapne Diye (Udhaar)', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    Text('₹ $totalGave', style: const TextStyle(fontSize: 18, color: Colors.red, fontWeight: FontWeight.bold)),
                  ],
                ),
                Column(
                  children: [
                    const Text('Aapko Mile (Jama)', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                    Text('₹ $totalGot', style: const TextStyle(fontSize: 18, color: Colors.green, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),
          // History List
          Expanded(
            child: history.isEmpty
                ? const Center(child: Text('Koi entry nahi hai. Niche button se add karein.'))
                : ListView.builder(
                    itemCount: history.length,
                    itemBuilder: (ctx, index) {
                      final item = history[index];
                      final isGave = item['type'] == 'GAVE';
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        child: ListTile(
                          title: Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text(item['date']),
                          trailing: Text(
                            '₹ ${item['amount']}',
                            style: TextStyle(
                              color: isGave ? Colors.red : Colors.green,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                onPressed: () => _showAddDialog('GAVE'),
                child: const Text('Aapne Diye (₹)'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                onPressed: () => _showAddDialog('GOT'),
                child: const Text('Aapko Mile (₹)'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddDialog(String type) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(type == 'GAVE' ? 'Udhaar Diya' : 'Paisa Mila'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Customer Ka Naam')),
            TextField(controller: _amountController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount (₹)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => _addTransaction(type), child: const Text('Save')),
        ],
      ),
    );
  }
}
