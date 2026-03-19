const { app, BrowserWindow, ipcMain } = require("electron");
const { initDB, db } = require("./src/backend/database");
const path = require("path");

let mainWindow = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "src/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.maximize();
  mainWindow.loadFile("src/index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
};

/* ===========================================================
   MÓDULO DE TRANSAÇÕES
   =========================================================== */

ipcMain.handle("save-transaction", async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO transactions (amount, description, type, date, category) 
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.value,
      data.description,
      data.type,
      data.data,
      data.category,
    );

    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("[Erro Backend] Salvar transação:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("search-transaction", async (event, period) => {
  try {
    let sql = "SELECT * FROM transactions";
    let params = [];

    if (period) {
      sql += " WHERE date LIKE ?";
      params.push(`${period}%`);
    }

    sql += " ORDER BY date DESC, id DESC";

    return db.prepare(sql).all(...params);
  } catch (err) {
    console.error("[Erro Backend] Buscar transações:", err);
    return [];
  }
});

ipcMain.handle("update-transaction", async (event, id, data) => {
  try {
    const stmt = db.prepare(`
      UPDATE transactions 
      SET amount = ?, description = ?, type = ?, category = ?, date = ?
      WHERE id = ?
    `);

    const info = stmt.run(
      data.value,
      data.description,
      data.type,
      data.category,
      data.data,
      id,
    );

    return { success: info.changes > 0 };
  } catch (err) {
    console.error("[Erro Backend] Atualizar transação:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-transaction", async (event, id) => {
  try {
    const info = db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    console.error("[Erro Backend] Deletar transação:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-summary", async (event, period) => {
  try {
    let sql = "SELECT type, SUM(amount) as total FROM transactions";
    let params = [];

    if (period) {
      sql += " WHERE date LIKE ?";
      params.push(`${period}%`);
    }

    sql += " GROUP BY type";
    const results = db.prepare(sql).all(...params);

    let summary = { inflow: 0, outflow: 0, balance: 0 };

    results.forEach((row) => {
      if (row.type === "income") summary.inflow = row.total;
      if (row.type === "expense") summary.outflow = row.total;
    });

    summary.balance = summary.inflow - summary.outflow;
    return summary;
  } catch (err) {
    console.error("[Erro Backend] Obter resumo financeiro:", err);
    return { inflow: 0, outflow: 0, balance: 0 };
  }
});

/* ===========================================================
   MÓDULO DE CARTÕES
   =========================================================== */

ipcMain.handle("save-card", async (event, card) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO cards (name, last_digits, bank_color, limit_value, day_expiry, card_type, account_balance, account_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      card.name,
      card.lastDigits,
      card.bankColor,
      card.limit,
      card.expiry,
      card.type,
      card.balance,
      card.accType,
    );
    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("[Erro Backend] Salvar cartão:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-cards", async () => {
  try {
    return db.prepare("SELECT * FROM cards ORDER BY id DESC").all();
  } catch (err) {
    console.error("[Erro Backend] Buscar cartões:", err);
    return [];
  }
});

ipcMain.handle("update-card", async (event, id, card) => {
  try {
    const stmt = db.prepare(`
      UPDATE cards 
      SET name = ?, last_digits = ?, bank_color = ?, limit_value = ?, day_expiry = ?, card_type = ?, account_balance = ?, account_type = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      card.name,
      card.lastDigits,
      card.bankColor,
      card.limit,
      card.expiry,
      card.type,
      card.balance,
      card.accType,
      id,
    );
    return { success: info.changes > 0 };
  } catch (err) {
    console.error("[Erro Backend] Atualizar cartão:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-card", async (event, id) => {
  try {
    const info = db.prepare("DELETE FROM cards WHERE id = ?").run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    console.error("[Erro Backend] Deletar cartão:", err);
    return { success: false, error: err.message };
  }
});

/* ===========================================================
   MÓDULO DE RELATÓRIOS
   =========================================================== */

ipcMain.handle("get-report-data", async (event, startDate, endDate) => {
  try {
    // Busca a lista de transações para desenhar a tabela e os gráficos
    const transactionsSql = `
      SELECT * FROM transactions 
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC
    `;
    const transactions = db.prepare(transactionsSql).all(startDate, endDate);

    const summarySql = `
      SELECT type, SUM(amount) as total FROM transactions 
      WHERE date >= ? AND date <= ?
      GROUP BY type
    `;
    const results = db.prepare(summarySql).all(startDate, endDate);

    let summary = { inflow: 0, outflow: 0, balance: 0 };
    results.forEach((row) => {
      if (row.type === "income") summary.inflow = row.total;
      if (row.type === "expense") summary.outflow = row.total;
    });
    summary.balance = summary.inflow - summary.outflow;

    return { transactions, summary };
  } catch (err) {
    console.error("[Erro Backend] Obter dados do relatório:", err);
    return { transactions: [], summary: { inflow: 0, outflow: 0, balance: 0 } };
  }
});

/* ===========================================================
   MÓDULO DE CONFIGURAÇÕES (Settings)
   =========================================================== */

ipcMain.handle("get-setting", async (event, key) => {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
  } catch (err) {
    console.error(`[Erro Backend] Buscar setting '${key}':`, err);
    return null;
  }
});

ipcMain.handle("save-setting", async (event, key, value) => {
  try {
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    ).run(key, value);
    return { success: true };
  } catch (err) {
    console.error(`[Erro Backend] Salvar setting '${key}':`, err);
    return { success: false, error: err.message };
  }
});

/* ===========================================================
   MÓDULO DE HISTÓRICO DE RELATÓRIOS
   =========================================================== */

ipcMain.handle("save-report-history", async (event, data) => {
  try {
    const last = db
      .prepare("SELECT * FROM report_history ORDER BY id DESC LIMIT 1")
      .get();

    if (
      last &&
      last.start_date === data.start &&
      last.end_date === data.end &&
      last.type === data.type
    ) {
      return { success: true, message: "Histórico já existe no topo" };
    }

    db.prepare(
      "INSERT INTO report_history (start_date, end_date, type, timestamp) VALUES (?, ?, ?, ?)",
    ).run(data.start, data.end, data.type, Date.now());

    // Limpeza automática (mantém 12 registros)
    db.prepare(
      `
      DELETE FROM report_history 
      WHERE id NOT IN (SELECT id FROM report_history ORDER BY id DESC LIMIT 12)
    `,
    ).run();

    return { success: true };
  } catch (err) {
    console.error("[Erro Backend] Salvar histórico de relatórios:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-report-history", async () => {
  try {
    return db.prepare("SELECT * FROM report_history ORDER BY id DESC").all();
  } catch (err) {
    console.error("[Erro Backend] Buscar histórico de relatórios:", err);
    return [];
  }
});

ipcMain.handle("clear-report-history", async () => {
  try {
    db.prepare("DELETE FROM report_history").run();
    return { success: true };
  } catch (err) {
    console.error("[Erro Backend] Limpar histórico de relatórios:", err);
    return { success: false, error: err.message };
  }
});

/* ===========================================================
   CICLO DE VIDA DO APP
   =========================================================== */

app.whenReady().then(() => {
  try {
    initDB();
    createWindow();
  } catch (err) {
    console.error("[Erro Crítico] Falha na inicialização do sistema:", err);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ===========================================================
   CONTROLES DA JANELA (CUSTOM TITLE BAR)
   =========================================================== */

ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});
