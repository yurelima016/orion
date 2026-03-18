const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "orion_finance.db");

// Inicialização com tratamento de erro
let db;
try {
  db = new Database(dbPath, { verbose: null });
} catch (error) {
  console.error("Erro fatal ao conectar com o banco de dados SQLite:", error);
  app.quit();
}

// Otimizações de Performance do SQLite
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

function initDB() {
  console.log("Banco de dados ativo em:", dbPath);

  try {
    // 1. TABELA DE CONFIGURAÇÕES GERAIS
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // 2. TABELA DE HISTÓRICO DE RELATÓRIOS
    db.exec(`
      CREATE TABLE IF NOT EXISTS report_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT,
        end_date TEXT,
        type TEXT,
        timestamp INTEGER
      )
    `);

    // 3. TABELA DE TRANSAÇÕES
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')), 
        category TEXT DEFAULT 'others',
        date TEXT NOT NULL
      )
    `);

    // 4. TABELA DE CARTÕES (Estrutura Base)
    db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        last_digits TEXT NOT NULL,
        bank_color TEXT DEFAULT 'card-black',
        limit_value REAL DEFAULT 0,
        day_expiry INTEGER NOT NULL
      )
    `);

    // =======================================================
    // MIGRATIONS
    // =======================================================

    // Verifica quais colunas existem na tabela cards atualmente
    const cardsColumns = db
      .prepare("PRAGMA table_info(cards)")
      .all()
      .map((col) => col.name);

    // Se a coluna 'card_type' não existir, cria ela agora
    if (!cardsColumns.includes("card_type")) {
      db.exec("ALTER TABLE cards ADD COLUMN card_type TEXT DEFAULT 'Crédito'");
      console.log("Migration: Coluna 'card_type' adicionada à tabela cards.");
    }

    if (!cardsColumns.includes("account_balance")) {
      db.exec("ALTER TABLE cards ADD COLUMN account_balance REAL DEFAULT 0");
      console.log(
        "Migration: Coluna 'account_balance' adicionada à tabela cards.",
      );
    }

    if (!cardsColumns.includes("account_type")) {
      db.exec(
        "ALTER TABLE cards ADD COLUMN account_type TEXT DEFAULT 'Corrente'",
      );
      console.log(
        "Migration: Coluna 'account_type' adicionada à tabela cards.",
      );
    }
  } catch (error) {
    console.error("Erro ao inicializar ou migrar as tabelas do banco:", error);
  }
}

module.exports = { db, initDB };
