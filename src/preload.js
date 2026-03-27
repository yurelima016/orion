// =========================================================
// PONTE DE COMUNICAÇÃO (IPC BRIDGE)
// =========================================================

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // ==========================================
  // TRANSAÇÕES
  // ==========================================
  saveTransaction: (data) => ipcRenderer.invoke("save-transaction", data),
  searchTransaction: (period) =>
    ipcRenderer.invoke("search-transaction", period),
  updateTransaction: (id, data) =>
    ipcRenderer.invoke("update-transaction", id, data),
  deleteTransaction: (id) => ipcRenderer.invoke("delete-transaction", id),
  getSummary: (period) => ipcRenderer.invoke("get-summary", period),

  // ==========================================
  // CARTÕES DE CRÉDITO / DÉBITO
  // ==========================================
  saveCard: (data) => ipcRenderer.invoke("save-card", data),
  getCards: () => ipcRenderer.invoke("get-cards"),
  updateCard: (id, data) => ipcRenderer.invoke("update-card", id, data),
  deleteCard: (id) => ipcRenderer.invoke("delete-card", id),

  // ==========================================
  // RELATÓRIOS
  // ==========================================
  getReportData: (start, end) =>
    ipcRenderer.invoke("get-report-data", start, end),
  saveReportHistory: (data) => ipcRenderer.invoke("save-report-history", data),
  getReportHistory: () => ipcRenderer.invoke("get-report-history"),
  clearReportHistory: () => ipcRenderer.invoke("clear-report-history"),

  // ==========================================
  // CONFIGURAÇÕES (Settings globais do App)
  // ==========================================
  getSetting: (key) => ipcRenderer.invoke("get-setting", key),
  saveSetting: (key, value) => ipcRenderer.invoke("save-setting", key, value),

  // ==========================================
  // CONTROLES DE JANELA (Custom Title Bar)
  // ==========================================
  windowMinimize: () => ipcRenderer.send("window-minimize"),
  windowMaximize: () => ipcRenderer.send("window-maximize"),
  windowClose: () => ipcRenderer.send("window-close"),
});
