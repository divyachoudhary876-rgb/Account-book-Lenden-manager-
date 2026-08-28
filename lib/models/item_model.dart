enum UnitType { tons, numbers, kg, bags }

class StockItem {
  final String id;
  final String firmId;
  final String name;
  final String hsnCode;
  final UnitType unit;
  double openingQuantity;
  double currentQuantity;
  double purchaseRate;
  double salesRate;

  StockItem({
    required this.id,
    required this.firmId,
    required this.name,
    required this.hsnCode,
    required this.unit,
    this.openingQuantity = 0.0,
    this.currentQuantity = 0.0,
    required this.purchaseRate,
    required this.salesRate,
  });

  // Calculate Total Stock Valuation
  double get totalStockValue => currentQuantity * purchaseRate;
}
