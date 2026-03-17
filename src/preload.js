const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveTransaction: (data) => ipcRenderer.invoke("save-transaction", data),

  searchTransaction: (period) =>
    ipcRenderer.invoke("search-transaction", period),

  getSummary: (period) => ipcRenderer.invoke("get-summary", period),

  deleteTransaction: (id) => ipcRenderer.invoke("delete-transaction", id),

  updateTransaction: (id, data) =>
    ipcRenderer.invoke("update-transaction", id, data),

  saveCard: (data) => ipcRenderer.invoke("save-card", data),

  getCards: () => ipcRenderer.invoke("get-cards"),

  deleteCard: (id) => ipcRenderer.invoke("delete-card", id),

  updateCard: (id, data) => ipcRenderer.invoke("update-card", id, data),

  getReportData: (start, end) =>
    ipcRenderer.invoke("get-report-data", start, end),
});
