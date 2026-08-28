import 'package:flutter/material.dart';

class DayBookScreen extends StatelessWidget {
  const DayBookScreen({Key? key}) : super(key: Key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Day Book (Double Entry)'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            color: const Color(0xFF1E293B),
            child: const ListTile(
              title: Text('By Cash Account (Dr.)', style: TextStyle(color: Colors.emeraldAccent, fontWeight: FontWeight.bold)),
              subtitle: Text('To Sales Account (Cr.)\nVoucher: V-1001', style: TextStyle(color: Colors.grey)),
              trailing: Text('₹15,000.00', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
