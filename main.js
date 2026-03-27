const { app, BrowserWindow, ipcMain } = require("electron");
const { initDB, db } = require("./src/backend/database");
const path = require("path");

let mainWindow = null;

// ===========================================================
// CONFIGURAÇÃO DA JANELA PRINCIPAL
// ===========================================================
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 1000,
    minHeight: 800,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets/orion-icon.png"),
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

ipcMain.handle("save-transaction", (event, data) => {
  try {
    const processPayment = db.transaction((txData) => {
      const stmt = db.prepare(`
        INSERT INTO transactions (amount, description, type, date, category, card_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        txData.value,
        txData.description,
        txData.type,
        txData.data,
        txData.category,
        txData.card_id || null,
      );

      const newTransactionId = info.lastInsertRowid;

      if (txData.card_id) {
        const card = db
          .prepare("SELECT * FROM cards WHERE id = ?")
          .get(txData.card_id);

        if (card) {
          if (card.card_type === "Débito") {
            let newBalance = card.account_balance;
            newBalance +=
              txData.type === "income" ? txData.value : -txData.value;
            db.prepare("UPDATE cards SET account_balance = ? WHERE id = ?").run(
              newBalance,
              txData.card_id,
            );
          } else if (card.card_type === "Crédito") {
            let newLimit = card.limit_value;
            newLimit += txData.type === "income" ? txData.value : -txData.value;
            db.prepare("UPDATE cards SET limit_value = ? WHERE id = ?").run(
              newLimit,
              txData.card_id,
            );
          }
        }
      }

      return newTransactionId;
    });

    const insertedId = processPayment(data);
    return { success: true, id: insertedId };
  } catch (err) {
    console.error("[Erro Backend] Salvar transação:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("search-transaction", (event, period) => {
  try {
    let sql = "SELECT * FROM transactions";
    let params = [];

    if (period) {
      sql += " WHERE date LIKE ? || '%'";
      params.push(period);
    }

    sql += " ORDER BY date DESC, id DESC";
    return db.prepare(sql).all(...params);
  } catch (err) {
    console.error("[Erro Backend] Buscar transações:", err);
    return [];
  }
});

ipcMain.handle("update-transaction", (event, id, data) => {
  try {
    const stmt = db.prepare(`
      UPDATE transactions 
      SET amount = ?, description = ?, type = ?, category = ?
      WHERE id = ?
    `);

    const info = stmt.run(
      data.value,
      data.description,
      data.type,
      data.category,
      id,
    );

    return { success: info.changes > 0 };
  } catch (err) {
    console.error("[Erro Backend] Atualizar transação:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-transaction", (event, id) => {
  try {
    const info = db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    console.error("[Erro Backend] Deletar transação:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-summary", (event, period) => {
  try {
    let sql = "SELECT type, SUM(amount) as total FROM transactions";
    let params = [];

    if (period) {
      sql += " WHERE date LIKE ? || '%'";
      params.push(period);
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

ipcMain.handle("save-card", (event, card) => {
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

ipcMain.handle("get-cards", () => {
  try {
    return db.prepare("SELECT * FROM cards ORDER BY id DESC").all();
  } catch (err) {
    console.error("[Erro Backend] Buscar cartões:", err);
    return [];
  }
});

ipcMain.handle("update-card", (event, id, card) => {
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

ipcMain.handle("delete-card", (event, id) => {
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

ipcMain.handle("get-report-data", (event, startDate, endDate) => {
  try {
    const transactions = db
      .prepare(
        `
      SELECT * FROM transactions 
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC
    `,
      )
      .all(startDate, endDate);

    const results = db
      .prepare(
        `
      SELECT type, SUM(amount) as total FROM transactions 
      WHERE date >= ? AND date <= ?
      GROUP BY type
    `,
      )
      .all(startDate, endDate);

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

ipcMain.handle("get-setting", (event, key) => {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
  } catch (err) {
    console.error(`[Erro Backend] Buscar setting '${key}':`, err);
    return null;
  }
});

ipcMain.handle("save-setting", (event, key, value) => {
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

ipcMain.handle("save-report-history", (event, data) => {
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
      `
      INSERT INTO report_history (start_date, end_date, type, timestamp) 
      VALUES (?, ?, ?, ?)
    `,
    ).run(data.start, data.end, data.type, Date.now());

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

ipcMain.handle("get-report-history", () => {
  try {
    return db.prepare("SELECT * FROM report_history ORDER BY id DESC").all();
  } catch (err) {
    console.error("[Erro Backend] Buscar histórico de relatórios:", err);
    return [];
  }
});

ipcMain.handle("clear-report-history", () => {
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
