const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "orion_finance.db");

const db = new Database(dbPath, { verbose: null });

db.pragma("journal_mode = WAL");

function initDB() {
  console.log("Banco de dados localizado em:", dbPath);

  // --- TABELA DE TRANSAÇÕES ---
  const sqlTransactions = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')), 
      category TEXT DEFAULT 'others',
      date TEXT NOT NULL
    )
  `;
  db.exec(sqlTransactions);

  // --- TABELA DE CARTÕES ---
  const sqlCards = `
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      last_digits TEXT NOT NULL,
      bank_color TEXT DEFAULT 'card-black',
      limit_value REAL DEFAULT 0,
      day_expiry INTEGER NOT NULL
    )
  `;
  db.exec(sqlCards);
  -runMigrations();
}

function runMigrations() {
  const tableInfo = db.pragma("table_info(transactions)");
  const hasCategory = tableInfo.some((col) => col.name === "category");

  if (!hasCategory) {
    try {
      db.exec(
        "ALTER TABLE transactions ADD COLUMN category TEXT DEFAULT 'others'"
      );
      console.log("✅ Migração: Coluna 'category' adicionada.");
    } catch (error) {
      console.error("Erro na migração de categoria:", error);
    }
  }
}

module.exports = { db, initDB };
