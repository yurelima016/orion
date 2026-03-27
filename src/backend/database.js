const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

// O banco fica salvo na pasta do sistema (AppData no Windows, Application Support no Mac)
const dbPath = path.join(app.getPath("userData"), "orion.db");

let db;
try {
  db = new Database(dbPath, { verbose: null });
} catch (error) {
  console.error("[Erro Fatal] Não foi possível conectar ao SQLite:", error);
  app.quit();
}

// =======================================================
// OTIMIZAÇÕES DE PERFORMANCE DO SQLITE
// =======================================================
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

function initDB() {
  console.log("Banco de dados ativo em:", dbPath);

  try {
    // TABELA DE CONFIGURAÇÕES GERAIS
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // TABELA DE HISTÓRICO DE RELATÓRIOS
    db.exec(`
      CREATE TABLE IF NOT EXISTS report_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT,
        end_date TEXT,
        type TEXT,
        timestamp INTEGER
      )
    `);

    // TABELA DE CARTÕES
    db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        last_digits TEXT NOT NULL,
        bank_color TEXT DEFAULT 'card-black',
        limit_value REAL DEFAULT 0,
        day_expiry INTEGER DEFAULT 1,
        card_type TEXT DEFAULT 'Crédito',
        account_balance REAL DEFAULT 0,
        account_type TEXT DEFAULT 'Corrente'
      )
    `);

    // TABELA DE TRANSAÇÕES
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')), 
        category TEXT DEFAULT 'others',
        date TEXT NOT NULL,
        card_id INTEGER,
        FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE SET NULL
      )
    `);
  } catch (error) {
    console.error("[Erro Backend] Falha ao inicializar tabelas:", error);
  }
}

module.exports = { db, initDB };
