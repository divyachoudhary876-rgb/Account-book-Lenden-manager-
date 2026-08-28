import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('neelkanth_accounting.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Accounts Table
    await db.execute('''
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        firmId TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        balance REAL NOT NULL
      )
    ''');

    // Vouchers Table
    await db.execute('''
      CREATE TABLE vouchers (
        id TEXT PRIMARY KEY,
        firmId TEXT NOT NULL,
        voucherNo TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        narration TEXT
      )
    ''');

    // Journal Items Table (Double-Entry Relations)
    await db.execute('''
      CREATE TABLE journal_entries (
        id TEXT PRIMARY KEY,
        voucherId TEXT NOT NULL,
        accountId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (voucherId) REFERENCES vouchers (id) ON DELETE CASCADE
      )
    ''');
  }
}
