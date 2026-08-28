import 'package:flutter/material.dart';

void main() {
  runApp(const MaterialApp(
    home: BusinessBookHome(),
    debugShowCheckedModeBanner: false,
  ));
}

class BusinessBookHome extends StatefulWidget {
  const BusinessBookHome({super.key});

  @override
  State<BusinessBookHome> createState() => _BusinessBookHomeState();
}

class _BusinessBookHomeState extends State<BusinessBookHome> {
  double totalGave = 0.0;
  double totalGot = 0.0;
  final List<Map<String, String>> transactions = [];

  final List<String> categories = [
    'Eent Bhatta - Pathai Majdoori',
    'Eent Bhatta - Koyla Kharid',
    'Eent Bhatta - Transport',
    'Customer Sales',
    'Other Expense'
  ];

  void _addEntry(String name, String amountStr, String type, String category) {
    double amt = double.tryParse(amountStr) ?? 0.0;
    setState(() {
      if (type == 'GAVE') {
        totalGave += amt;
      } else {
        totalGot += amt;
      }
      transactions.add({
        'name': name,
        'amount': amt.toString(),
        'type': type,
        'category': category,
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Business Book : Lenden Manager'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.indigo.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('Diye (Gave)', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    Text('₹ $totalGave', style: const TextStyle(color: Colors.red, fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
                Column(
                  children: [
                    const Text('Mile (Got)', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                    Text('₹ $totalGot', style: const TextStyle(color: Colors.green, fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: transactions.isEmpty
                ? const Center(child: Text('Koi entry nahi hai. Niche + button se add karein.'))
                : ListView.builder(
                    itemCount: transactions.length,
                    itemBuilder: (context, i) {
                      final item = transactions[i];
                      bool isGave = item['type'] == 'GAVE';
                      return ListTile(
                        title: Text(item['name'] ?? ''),
                        subtitle: Text(item['category'] ?? ''),
                        trailing: Text(
                          '${isGave ? '-' : '+'} ₹${item['amount']}',
                          style: TextStyle(
                            color: isGave ? Colors.red : Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showDialog(context),
        backgroundColor: Colors.indigo,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  void _showDialog(BuildContext context) {
    String name = '';
    String amount = '';
    String type = 'GOT';
    String category = categories.first;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Add Transaction'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButton<String>(
                      value: category,
                      isExpanded: true,
                      items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) => setDialogState(() => category = v!),
                    ),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Name'),
                      onChanged: (v) => name = v,
                    ),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Amount'),
                      keyboardType: TextInputType.number,
                      onChanged: (v) => amount = v,
                    ),
                    Row(
                      children: [
                        Expanded(
                          child: RadioListTile(
                            title: const Text('Got'),
                            value: 'GOT',
                            groupValue: type,
                            onChanged: (v) => setDialogState(() => type = v.toString()),
                          ),
                        ),
                        Expanded(
                          child: RadioListTile(
                            title: const Text('Gave'),
                            value: 'GAVE',
                            groupValue: type,
                            onChanged: (v) => setDialogState(() => type = v.toString()),
                          ),
                        ),
                      ],
                    )
                  ],
                ),
              ),
              actions: [
                ElevatedButton(
                  onPressed: () {
                    if (name.isNotEmpty && amount.isNotEmpty) {
                      _addEntry(name, amount, type, category);
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('Save'),
                )
              ],
            );
          },
        );
      },
    );
  }
}
