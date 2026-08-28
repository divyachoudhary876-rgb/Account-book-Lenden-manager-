enum AccountCategory { asset, liability, equity, revenue, expense }

class LedgerAccount {
  final String id;
  final String firmId;
  final String name;
  final AccountCategory category;
  double currentBalance;

  LedgerAccount({
    required this.id,
    required this.firmId,
    required this.name,
    required this.category,
    this.currentBalance = 0.0,
  });
}

class VoucherItem {
  final String accountId;
  final String accountName;
  final String type; // 'DEBIT' or 'CREDIT'
  final double amount;

  VoucherItem({
    required this.accountId,
    required this.accountName,
    required this.type,
    required this.amount,
  });
}

class VoucherRecord {
  final String id;
  final String firmId;
  final String voucherNumber;
  final String voucherType; // Sales, Purchase, Payment, Receipt
  final DateTime date;
  final List<VoucherItem> entries;

  VoucherRecord({
    required this.id,
    required this.firmId,
    required this.voucherNumber,
    required this.voucherType,
    required this.date,
    required this.entries,
  });
}
