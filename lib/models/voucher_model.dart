enum EntryType { debit, credit }
enum VoucherType { sales, purchase, payment, receipt, journal }

class JournalEntryModel {
  final String accountId;
  final String accountName;
  final EntryType type;
  final double amount;

  JournalEntryModel({
    required this.accountId,
    required this.accountName,
    required this.type,
    required this.amount,
  });
}

class VoucherModel {
  final String voucherNumber;
  final VoucherType type;
  final DateTime date;
  final List<JournalEntryModel> entries;

  VoucherModel({
    required this.voucherNumber,
    required this.type,
    required this.date,
    required this.entries,
  });

  bool get isBalanced {
    double totalDr = entries.where((e) => e.type == EntryType.debit).fold(0, (sum, e) => sum + e.amount);
    double totalCr = entries.where((e) => e.type == EntryType.credit).fold(0, (sum, e) => sum + e.amount);
    return (totalDr - totalCr).abs() < 0.001 && totalDr > 0;
  }
}
