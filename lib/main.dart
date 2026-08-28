import 'package:flutter/material.dart';
import 'screens/voucher_entry_screen.dart';

void main() {
  runApp(const AccountingApp());
}

class AccountingApp extends StatelessWidget {
  const AccountingApp({Key? key}) : super(key: Key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Enterprise Account Book',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        primaryColor: Colors.emerald,
      ),
      home: const VoucherEntryScreen(),
    );
  }
}
