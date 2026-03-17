const { app, BrowserWindow, ipcMain } = require("electron");
const { initDB, db } = require("./src/backend/database");
const path = require("path");

// Mantém uma referência global para evitar que o Garbage Collector feche a janela
let mainWindow = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    autoHideMenuBar: true,

    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "transparent",
      symbolColor: "#2c3e50",
      height: 35,
    },

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

// Salvar Nova Transação
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
      data.category
    );

    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("Erro ao salvar transação:", err);
    return { success: false, error: err.message };
  }
});

// Buscar Transações (Filtro por período ou Geral)
ipcMain.handle("search-transaction", async (event, period) => {
  try {
    let sql = "SELECT * FROM transactions";
    let params = [];

    // Se tiver período (YYYY-MM), faz o filtro
    if (period) {
      sql += " WHERE date LIKE ?";
      params.push(`${period}%`);
    }

    sql += " ORDER BY date DESC, id DESC"; // Ordenação dupla para consistência

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error("Erro ao buscar transações:", err);
    return [];
  }
});

// Atualizar Transação
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
      id
    );

    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erro ao atualizar transação:", err);
    return { success: false, error: err.message };
  }
});

// Deletar Transação
ipcMain.handle("delete-transaction", async (event, id) => {
  try {
    const info = db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erro ao deletar transação:", err);
    return { success: false, error: err.message };
  }
});

// Obter Resumo (Saldo, Entradas, Saídas)
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

    // Transforma o array do banco em um objeto fácil de usar
    let summary = { inflow: 0, outflow: 0, balance: 0 };

    results.forEach((row) => {
      if (row.type === "income") summary.inflow = row.total;
      if (row.type === "expense") summary.outflow = row.total;
    });

    summary.balance = summary.inflow - summary.outflow;
    return summary;
  } catch (err) {
    console.error("Erro no resumo:", err);
    return { inflow: 0, outflow: 0, balance: 0 };
  }
});

/* ===========================================================
   MÓDULO DE CARTÕES
   =========================================================== */

ipcMain.handle("save-card", async (event, card) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO cards (name, last_digits, bank_color, limit_value, day_expiry)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      card.name,
      card.lastDigits,
      card.bankColor,
      card.limit,
      card.expiry
    );
    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("Erro ao salvar cartão:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-cards", async () => {
  try {
    return db.prepare("SELECT * FROM cards ORDER BY id DESC").all();
  } catch (err) {
    console.error("Erro ao buscar cartões:", err);
    return [];
  }
});

ipcMain.handle("update-card", async (event, id, card) => {
  try {
    const stmt = db.prepare(`
      UPDATE cards 
      SET name = ?, last_digits = ?, bank_color = ?, limit_value = ?, day_expiry = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      card.name,
      card.lastDigits,
      card.bankColor,
      card.limit,
      card.expiry,
      id
    );
    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erro ao atualizar cartão:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-card", async (event, id) => {
  try {
    const info = db.prepare("DELETE FROM cards WHERE id = ?").run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/* ===========================================================
   MÓDULO DE RELATÓRIOS
   =========================================================== */

ipcMain.handle("get-report-data", async (event, startDate, endDate) => {
  try {
    const sql = `
      SELECT * FROM transactions 
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC
    `;
    const transactions = db.prepare(sql).all(startDate, endDate);

    let inflow = 0;
    let outflow = 0;

    for (const t of transactions) {
      if (t.type === "income") inflow += t.amount;
      else if (t.type === "expense") outflow += t.amount;
    }

    return {
      transactions,
      summary: { inflow, outflow, balance: inflow - outflow },
    };
  } catch (err) {
    console.error("Erro no relatório:", err);
    return { transactions: [], summary: { inflow: 0, outflow: 0, balance: 0 } };
  }
});

/* ===========================================================
   CICLO DE VIDA DO APP
   =========================================================== */

app.whenReady().then(() => {
  initDB();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
