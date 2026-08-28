import 'package:flutter/material.dart';

class LedgerBookScreen extends StatelessWidget {
  final String accountName;
  final double currentBalance;

  const LedgerBookScreen({
    Key? key,
    this.accountName = 'Cash Account',
    this.currentBalance = 45000.00,
  }) : super(key: Key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Ledger: $accountName'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: const Color(0xFF1E293B),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Closing Balance:', style: TextStyle(color: Colors.grey)),
                Text('₹${currentBalance.toStringAsFixed(2)}',
                    style: const TextStyle(color: Colors.emeraldAccent, fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              children: const [
                ListTile(
                  title: Text('To Sales A/c', style: TextStyle(color: Colors.white)),
                  subtitle: Text('28 Aug 2026 | Voucher #V-1001', style: TextStyle(color: Colors.grey)),
                  trailing: Text('+ ₹15,000.00', style: TextStyle(color: Colors.emeraldAccent)),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}
