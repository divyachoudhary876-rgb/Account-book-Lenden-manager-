enum VoucherType { sales, purchase, payment, receipt, journal }
enum EntryType { debit, credit }

class JournalEntryItem {
  final String accountId;
  final String accountName;
  final EntryType type;
  final double amount;

  JournalEntryItem({
    required this.accountId,
    required this.accountName,
    required this.type,
    required this.amount,
  });
}

class VoucherRecord {
  final String id;
  final String voucherNumber;
  final VoucherType voucherType;
  final DateTime date;
  final List<JournalEntryItem> entries;

  VoucherRecord({
    required this.id,
    required this.voucherNumber,
    required this.voucherType,
    required this.date,
    required this.entries,
  });

  bool get isBalanced {
    double dr = entries.where((e) => e.type == EntryType.debit).fold(0.0, (s, e) => s + e.amount);
    double cr = entries.where((e) => e.type == EntryType.credit).fold(0.0, (s, e) => s + e.amount);
    return (dr - cr).abs() < 0.001 && dr > 0;
  }
}
