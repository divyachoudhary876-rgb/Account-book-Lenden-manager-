class LedgerAccount {
  final String id;
  final String code;
  final String name;
  final String category; // Asset, Liability, Equity, Revenue, Expense
  double currentBalance;

  LedgerAccount({
    required this.id,
    required this.code,
    required this.name,
    required this.category,
    this.currentBalance = 0.0,
  });
}
