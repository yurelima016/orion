// --- ESTADO GLOBAL ---
let currentTransactions = [];
let currentCards = [];
let editingTransactionId = null;
let editingCardId = null;

// =========================================================
// INICIALIZAÇÃO E NAVEGAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupUserProfile();
  setupPdfExport(); // Função do arquivo pdf.js

  // Define mês atual no filtro
  const monthFilter = document.getElementById("month-filter");
  const today = new Date();
  monthFilter.value = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  monthFilter.addEventListener("change", () => {
    loadTransactions();
    loadSummary();
  });

  // Carregamento inicial
  loadTransactions();
  loadSummary();
  loadEvolutionData();
  loadCards();
  initTableEvents();
  initCardEvents();
  renderReportHistory();
});

function setupNavigation() {
  const views = {
    dashboard: document.getElementById("view-dashboard"),
    cards: document.getElementById("view-cards"),
    reports: document.getElementById("view-reports"),
  };

  const links = {
    dashboard: document.getElementById("link-dashboard"),
    cards: document.getElementById("link-cards"),
    reports: document.getElementById("link-reports"),
  };

  const switchView = (viewName) => {
    // Esconde tudo
    Object.values(views).forEach((el) => (el.style.display = "none"));
    Object.values(links).forEach((el) => {
      el.classList.remove("active");
      const icon = el.querySelector("i");
      icon.className = icon.className.replace("-fill", "");
    });

    // Mostra selecionado
    views[viewName].style.display = "block";
    links[viewName].classList.add("active");

    const activeIcon = links[viewName].querySelector("i");
    const iconClass = Array.from(activeIcon.classList).find(
      (c) => c.startsWith("bi-") && c !== "bi"
    );
    if (iconClass && !iconClass.includes("-fill")) {
      activeIcon.classList.replace(iconClass, iconClass + "-fill");
    }
  };

  Object.keys(links).forEach((key) => {
    links[key].addEventListener("click", (e) => {
      e.preventDefault();
      switchView(key);
    });
  });
}

function setupUserProfile() {
  const btnEditUser = document.querySelector(".edit-user-btn");
  const userInfoDiv = document.querySelector(".user-info");
  const userNameSpan = document.querySelector(".user-info span");

  const savedName = localStorage.getItem("orion_user_name");
  if (savedName) userNameSpan.textContent = `Olá, ${savedName}`;

  btnEditUser.addEventListener("click", (e) => {
    e.preventDefault();

    const existingInput = userInfoDiv.querySelector("input");

    if (existingInput) {
      const newName = existingInput.value.trim();

      if (newName) {
        userNameSpan.textContent = `Olá, ${newName}`;
        localStorage.setItem("orion_user_name", newName);
      }

      userNameSpan.style.display = "inline";
      existingInput.remove();
      btnEditUser.innerHTML = '<i class="bi bi-pencil-square"></i>';
    } else {
      const currentName = userNameSpan.textContent.replace("Olá, ", "");

      userNameSpan.style.display = "none";

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentName;

      input.style.width = "120px";
      input.style.padding = "4px 8px";
      input.style.borderRadius = "4px";
      input.style.border = "1px solid #34495e";
      input.style.background = "#0d1117";
      input.style.color = "#fff";
      input.style.fontSize = "0.9rem";
      input.style.outline = "none";

      userInfoDiv.appendChild(input);
      input.focus();

      btnEditUser.innerHTML =
        '<i class="bi bi-check-lg" style="color: #2ecc71;"></i>';

      input.addEventListener("keypress", (k) => {
        if (k.key === "Enter") btnEditUser.click();
      });
    }
  });
}

// =========================================================
// TRANSAÇÕES (DASHBOARD)
// =========================================================

async function loadTransactions() {
  const period = document.getElementById("month-filter").value;
  currentTransactions = await window.api.searchTransaction(period);

  const tbody = document.getElementById("lista-transacoes");
  tbody.innerHTML = "";

  const icons = {
    others: "📦",
    food: "🍔",
    home: "🏠",
    transport: "🚗",
    leisure: "🎉",
    work: "💼",
  };

  let htmlContent = "";
  currentTransactions.forEach((t) => {
    const cat = t.category || "others";
    const icon = icons[cat] || "📦";
    const color = t.type === "income" ? "#27ae60" : "#c0392b";
    const sign = t.type === "income" ? "+" : "-";

    htmlContent += `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="row-checkbox" value="${
          t.id
        }"></td>
        <td>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">${icon}</span>
                <span>${t.description}</span>
            </div>
        </td>
        <td class="amount-col" style="color: ${color}">${sign} ${formatCurrency(
      t.amount
    )}</td>
        <td>${new Date(t.date).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        })}</td>
        <td style="text-align: center;">
          <button class="btn-edit btn-action-edit" data-id="${
            t.id
          }"><i class="bi bi-pen"></i></button>
          <button class="btn-delete btn-action-delete" data-id="${
            t.id
          }"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`;
  });

  tbody.innerHTML = htmlContent;

  setupCheckboxEvents();

  // Atualiza Gráficos (Funções do charts.js)
  renderCategoryChart(currentTransactions);
  renderDailyChart(currentTransactions);
}

async function loadSummary() {
  const period = document.getElementById("month-filter").value;
  const summary = await window.api.getSummary(period);

  const els = {
    balance: document.getElementById("saldo"),
    income: document.getElementById("entradas"),
    expense: document.getElementById("saidas"),
  };

  els.balance.textContent = formatCurrency(summary.balance);
  els.income.textContent = `+ ` + formatCurrency(summary.inflow || 0);
  els.expense.textContent = `- ` + formatCurrency(summary.outflow || 0);

  // Cores dinâmicas
  els.balance.style.color = "#222b33";
  els.income.style.color = "#27ae60";
  els.expense.style.color = "#c0392b";
}

async function loadEvolutionData() {
  const months = getLast6Months(); // do utils.js
  const promises = months.map((period) => window.api.getSummary(period));
  const results = await Promise.all(promises);

  const labels = [];
  const incomes = [];
  const expenses = [];

  results.forEach((data, index) => {
    const [year, month] = months[index].split("-");
    labels.push(`${month}/${year.slice(2)}`);
    incomes.push(data.inflow || 0);
    expenses.push(data.outflow || 0);
  });

  // Chama o renderizador do charts.js
  renderEvolutionChart(labels, incomes, expenses);
}

// Salvar Transação
document.getElementById("save-button").addEventListener("click", async (e) => {
  e.preventDefault();
  const descInput = document.getElementById("description");
  const valueInput = document.getElementById("amount");
  const typeInput = document.getElementById("type");
  const catInput = document.getElementById("category");

  if (!descInput.value.trim()) {
    setInputError(descInput);
    return;
  }
  if (!valueInput.value) {
    setInputError(valueInput);
    return;
  }

  const data = {
    value: Number(valueInput.value),
    description: descInput.value,
    type: typeInput.value,
    category: catInput.value,
    data: new Date().toISOString(),
  };

  let result;
  if (editingTransactionId) {
    result = await window.api.updateTransaction(editingTransactionId, data);
  } else {
    result = await window.api.saveTransaction(data);
  }

  if (result.success) {
    descInput.value = "";
    valueInput.value = "";
    editingTransactionId = null;

    // Reseta botão
    const btn = document.getElementById("save-button");
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Confirmar Transação';
    btn.style.background = "linear-gradient(135deg, #0c1116, #1f262e)";

    loadTransactions();
    loadSummary();
    loadEvolutionData();
    descInput.focus();
  }
});

function initTableEvents() {
  const tbody = document.getElementById("lista-transacoes");
  tbody.addEventListener("click", (event) => {
    const btnEdit = event.target.closest(".btn-action-edit");
    const btnDelete = event.target.closest(".btn-action-delete");

    if (btnDelete) deleteItem(btnDelete.dataset.id);
    if (btnEdit) {
      const t = currentTransactions.find(
        (item) => String(item.id) === String(btnEdit.dataset.id)
      );
      if (t) startEdit(t);
    }
  });
}

function startEdit(t) {
  document.getElementById("description").value = t.description;
  document.getElementById("amount").value = t.amount;
  document.getElementById("type").value = t.type;
  document.getElementById("category").value = t.category || "others";
  editingTransactionId = t.id;

  const btnSave = document.getElementById("save-button");
  btnSave.innerHTML = '<i class="bi bi-check-circle"></i> Atualizar Transação';
  btnSave.style.background = "linear-gradient(135deg, #f39c12, #d35400)";
  document.querySelector(".form").scrollIntoView({ behavior: "smooth" });
}

async function deleteItem(id) {
  if (await showCustomModal()) {
    // Modal do utils.js
    await window.api.deleteTransaction(id);
    loadTransactions();
    loadSummary();
    loadEvolutionData();
  }
}

// Lógica de exclusão em massa
function setupCheckboxEvents() {
  const selectAll = document.getElementById("select-all");
  const rowCheckboxes = document.querySelectorAll(".row-checkbox");
  const btnBulk = document.getElementById("btn-bulk-delete");

  const updateBulkBtn = () => {
    const count = document.querySelectorAll(".row-checkbox:checked").length;
    if (count > 0) {
      btnBulk.style.display = "block";
      document.getElementById("selected-count").textContent = count;
    } else {
      btnBulk.style.display = "none";
    }
  };

  selectAll.onclick = () => {
    rowCheckboxes.forEach((cb) => (cb.checked = selectAll.checked));
    updateBulkBtn();
  };

  rowCheckboxes.forEach((cb) => {
    cb.onclick = () => {
      if (!cb.checked) selectAll.checked = false;
      updateBulkBtn();
    };
  });
}

document
  .getElementById("btn-bulk-delete")
  .addEventListener("click", async () => {
    const selected = document.querySelectorAll(".row-checkbox:checked");
    if (
      selected.length > 0 &&
      (await showCustomModal("Excluir Vários?", "Apagar itens selecionados?"))
    ) {
      for (const cb of selected) {
        await window.api.deleteTransaction(cb.value);
      }
      loadTransactions();
      loadSummary();
      loadEvolutionData();
    }
  });

// =========================================================
// CARTÕES
// =========================================================

async function loadCards() {
  currentCards = await window.api.getCards();
  const container = document.getElementById("cards-container");
  container.innerHTML = "";

  // Métricas
  let totalLimit = currentCards.reduce(
    (acc, c) => acc + Number(c.limit_value || 0),
    0
  );
  document.getElementById("total-limit-display").textContent =
    formatCurrency(totalLimit);
  document.getElementById("total-cards-display").textContent =
    currentCards.length;

  // Botão Adicionar
  container.innerHTML += `
        <div class="card-add-ghost btn-open-add-card">
            <i class="bi bi-plus-lg"></i><span>Novo Cartão</span>
        </div>`;

  const hiddenGroup = `<div class="dots-group"><i class="bi bi-asterisk"></i><i class="bi bi-asterisk"></i><i class="bi bi-asterisk"></i><i class="bi bi-asterisk"></i></div>`;

  currentCards.forEach((card) => {
    let bgClass = bankColors[card.bank_color] || "card-black";
    let styleAttr = "";
    if (bgClass.includes("background:")) {
      styleAttr = `style="${bgClass}"`;
      bgClass = "credit-card";
    } else {
      bgClass = `credit-card ${bgClass}`;
    }

    container.innerHTML += `
            <div class="${bgClass}" ${styleAttr}>
                <div class="card-top">
                    <div class="card-brand-wrapper">
                        <span class="card-chip"></span>
                        <span class="card-logo"><i class="bi bi-bank"></i> ${
                          card.bank_color?.toUpperCase() || "BANK"
                        }</span>
                    </div>
                    <div class="card-actions">
                        <i class="bi bi-pencil-square btn-edit-card" data-id="${
                          card.id
                        }" title="Editar"></i>
                        <i class="bi bi-trash3-fill btn-delete-card" data-id="${
                          card.id
                        }" title="Excluir"></i>
                    </div>
                </div>
                <div class="card-number">
                   ${hiddenGroup}${hiddenGroup}${hiddenGroup}
                   <span class="visible-digits">${card.last_digits}</span>
                </div>
                <div class="card-details">
                    <div><span style="opacity:0.7; font-size:0.7rem">TITULAR</span><br><strong>${card.name.toUpperCase()}</strong></div>
                    <div style="text-align:right"><span style="opacity:0.7; font-size:0.7rem">VALIDADE</span><br><strong>${
                      card.day_expiry
                    }/28</strong></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:0.9rem; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
                    <span>Limite Total</span><strong>${formatCurrency(
                      card.limit_value
                    )}</strong>
                </div>
            </div>
        `;
  });
}

function initCardEvents() {
  const container = document.getElementById("cards-container");
  container.addEventListener("click", (event) => {
    const btnEdit = event.target.closest(".btn-edit-card");
    const btnDelete = event.target.closest(".btn-delete-card");
    const btnAdd = event.target.closest(".btn-open-add-card");

    if (btnAdd) openNewCardModal();
    if (btnDelete) removeCard(btnDelete.dataset.id);
    if (btnEdit) {
      const card = currentCards.find(
        (c) => String(c.id) === String(btnEdit.dataset.id)
      );
      if (card) startEditCard(card);
    }
  });
}

const cardForm = document.getElementById("card-form");
const cardModal = document.getElementById("card-modal");

document.getElementById("btn-close-card-modal").onclick = () =>
  (cardModal.style.display = "none");

function openNewCardModal() {
  editingCardId = null;
  cardForm.reset();
  cardModal.querySelector("h3").textContent = "Novo Cartão";
  cardModal.style.display = "flex";
}

function startEditCard(card) {
  document.getElementById("card-name").value = card.name;
  document.getElementById("card-last-digits").value = card.last_digits;
  document.getElementById("card-bank").value = card.bank_color;
  document.getElementById("card-limit").value = card.limit_value;
  document.getElementById("card-expiry").value = card.day_expiry;
  editingCardId = card.id;

  cardModal.querySelector("h3").textContent = "Editar Cartão";
  cardModal.style.display = "flex";
}

cardForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById("card-name").value,
    lastDigits: document.getElementById("card-last-digits").value,
    bankColor: document.getElementById("card-bank").value,
    limit: Number(document.getElementById("card-limit").value),
    expiry: document.getElementById("card-expiry").value,
  };

  let res;
  if (editingCardId) res = await window.api.updateCard(editingCardId, data);
  else res = await window.api.saveCard(data);

  if (res.success) {
    cardModal.style.display = "none";
    loadCards();
  }
});

async function removeCard(id) {
  if (await showCustomModal("Excluir Cartão?", "Remover este cartão?")) {
    await window.api.deleteCard(id);
    loadCards();
  }
}

// =========================================================
// RELATÓRIOS
// =========================================================
const inputStart = document.getElementById("report-start");
const inputEnd = document.getElementById("report-end");

// Padrão (mês atual)
const d = new Date();
inputEnd.value = formatDateInput(d);
d.setDate(1);
inputStart.value = formatDateInput(d);

document
  .getElementById("btn-generate-report")
  .addEventListener("click", async () => {
    const start = inputStart.value;
    const end = inputEnd.value;
    const type = document.getElementById("report-type").value;

    if (!start || !end) return;

    saveReportToHistory(start, end, type);

    const data = await window.api.getReportData(start, end);
    let filtered = data.transactions;
    if (type !== "all") filtered = filtered.filter((t) => t.type === type);

    // Recalcula Totais
    let inflow = 0,
      outflow = 0;
    filtered.forEach((t) => {
      if (t.type === "income") inflow += t.amount;
      if (t.type === "expense") outflow += t.amount;
    });

    document.getElementById("report-inflow").textContent =
      formatCurrency(inflow);
    document.getElementById("report-outflow").textContent =
      formatCurrency(outflow);
    document.getElementById("report-balance").textContent = formatCurrency(
      inflow - outflow
    );

    // Tabela Relatório
    const tbody = document.getElementById("report-table-body");
    tbody.innerHTML = "";

    const icons = {
      others: "📦",
      food: "🍔",
      home: "🏠",
      transport: "🚗",
      leisure: "🎉",
      work: "💼",
    };

    filtered.forEach((t) => {
      const cat = t.category || "others";
      const info = categoryMap[cat] || categoryMap.others;
      const color = t.type === "income" ? "#27ae60" : "#c0392b";

      tbody.innerHTML += `
            <tr>
                <td>${new Date(t.date).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}</td>
                <td><span class="category-badge badge-${cat}">${
        icons[cat] || "📦"
      } ${info.label}</span></td>
                <td>${t.description}</td>
                <td style="color:${color}; font-weight:bold">${
        t.type === "income" ? "+" : "-"
      } ${formatCurrency(t.amount)}</td>
            </tr>`;
    });

    renderReportChart(filtered);

    document.getElementById("report-summary-area").style.display = "flex";
    document.getElementById("report-content").style.display = "flex";
    document.getElementById("btn-export-pdf").style.display = "inline-flex";

    const labelMap = {
      all: "Todas",
      income: "Apenas Entradas",
      expense: "Apenas Saídas",
    };
    document.getElementById(
      "report-period-label"
    ).textContent = `Período: ${new Date(start).toLocaleDateString(
      "pt-BR"
    )} até ${new Date(end).toLocaleDateString("pt-BR")} (${labelMap[type]})`;
  });

// Histórico
const HISTORY_KEY = "orion_report_history";

function saveReportToHistory(start, end, type) {
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const item = { start, end, type, timestamp: Date.now() };

  // Evita duplicata topo
  if (history.length > 0) {
    const last = history[0];
    if (last.start === start && last.end === end && last.type === type) return;
  }

  history.unshift(item);
  if (history.length > 4) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderReportHistory();
}

function renderReportHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const container = document.getElementById("history-list");

  if (history.length === 0) {
    container.innerHTML =
      '<p style="color: #bdc3c7; text-align: center; width: 100%;">Nenhum histórico recente.</p>';
    return;
  }

  container.innerHTML = "";
  const types = { all: "Todas", income: "Entradas", expense: "Saídas" };

  history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-card";
    div.innerHTML = `
            <div style="display:flex; justify-content:space-between;"><i class="bi bi-file-earmark-text"></i> <small>Reutilizar</small></div>
            <div class="history-period">${new Date(
              item.start
            ).toLocaleDateString("pt-BR", { timeZone: "UTC" })} - ${new Date(
      item.end
    ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
            <div class="history-type">${types[item.type]}</div>
        `;
    div.onclick = () => {
      inputStart.value = item.start;
      inputEnd.value = item.end;
      document.getElementById("report-type").value = item.type;
      document.getElementById("btn-generate-report").click();
    };
    container.appendChild(div);
  });
}

window.clearReportHistory = async function () {
  if (await showCustomModal("Limpar?", "Apagar histórico?")) {
    localStorage.removeItem(HISTORY_KEY);
    renderReportHistory();
  }
};
