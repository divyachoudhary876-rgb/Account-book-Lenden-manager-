import 'package:flutter/material.dart';

class VoucherEntryScreen extends StatefulWidget {
  const VoucherEntryScreen({Key? key}) : super(key: Key);

  @override
  State<VoucherEntryScreen> createState() => _VoucherEntryScreenState();
}

class _VoucherEntryScreenState extends State<VoucherEntryScreen> {
  final List<Map<String, dynamic>> _entries = [
    {'type': 'DEBIT', 'account': '', 'amount': 0.0},
    {'type': 'CREDIT', 'account': '', 'amount': 0.0},
  ];

  double get _totalDebit => _entries
      .where((e) => e['type'] == 'DEBIT')
      .fold(0.0, (sum, e) => sum + (e['amount'] ?? 0.0));

  double get _totalCredit => _entries
      .where((e) => e['type'] == 'CREDIT')
      .fold(0.0, (sum, e) => sum + (e['amount'] ?? 0.0));

  bool get _isBalanced => (_totalDebit - _totalCredit).abs() < 0.001 && _totalDebit > 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Voucher & Journal Entry'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isBalanced ? Colors.emerald.withOpacity(0.15) : Colors.amber.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _isBalanced ? Colors.emerald : Colors.amber),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _isBalanced ? '✓ Journal Balanced' : '⚠ Difference: ₹${(_totalDebit - _totalCredit).abs().toStringAsFixed(2)}',
                    style: TextStyle(color: _isBalanced ? Colors.emeraldAccent : Colors.amberAccent, fontWeight: FontWeight.bold),
                  ),
                  Text('Dr: ₹${_totalDebit.toStringAsFixed(2)} | Cr: ₹${_totalCredit.toStringAsFixed(2)}',
                      style: const TextStyle(color: Colors.white, fontFamily: 'monospace')),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: _entries.length,
                itemBuilder: (context, index) {
                  return Card(
                    color: const Color(0xFF1E293B),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Row(
                        children: [
                          DropdownButton<String>(
                            value: _entries[index]['type'],
                            dropdownColor: const Color(0xFF0F172A),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            items: const [
                              DropdownMenuItem(value: 'DEBIT', child: Text('By (Dr.)')),
                              DropdownMenuItem(value: 'CREDIT', child: Text('To (Cr.)')),
                            ],
                            onChanged: (val) {
                              setState(() => _entries[index]['type'] = val);
                            },
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              style: const TextStyle(color: Colors.white),
                              decoration: const InputDecoration(
                                hintText: 'Account ID/Name',
                                hintStyle: TextStyle(color: Colors.grey),
                              ),
                              onChanged: (val) => _entries[index]['account'] = val,
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            width: 90,
                            child: TextField(
                              keyboardType: TextInputType.number,
                              style: const TextStyle(color: Colors.white),
                              decoration: const InputDecoration(
                                hintText: 'Amount',
                                hintStyle: TextStyle(color: Colors.grey),
                              ),
                              onChanged: (val) {
                                setState(() {
                                  _entries[index]['amount'] = double.tryParse(val) ?? 0.0;
                                });
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            ElevatedButton(
              onPressed: _isBalanced ? () {} : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.emerald,
                minimumSize: const Size.fromHeight(48),
              ),
              child: const Text('Post Journal Voucher', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
