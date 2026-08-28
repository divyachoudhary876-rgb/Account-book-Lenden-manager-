enum EntryType { DEBIT, CREDIT }

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

  Map<String, dynamic> toJson() => {
        'accountId': accountId,
        'accountName': accountName,
        'type': type.name,
        'amount': amount,
      };
}

class VoucherModel {
  final String id;
  final String voucherNumber;
  final DateTime date;
  final String narration;
  final List<JournalEntryItem> entries;

  VoucherModel({
    required this.id,
    required this.voucherNumber,
    required this.date,
    required this.narration,
    required this.entries,
  });

  // Strict Double-Entry Validation Rule
  bool get isBalanced {
    double dr = entries
        .where((e) => e.type == EntryType.DEBIT)
        .fold(0.0, (sum, e) => sum + e.amount);
    double cr = entries
        .where((e) => e.type == EntryType.CREDIT)
        .fold(0.0, (sum, e) => sum + e.amount);
    return (dr - cr).abs() < 0.001 && dr > 0;
  }
}
