// =========================================================
// ESTADO GLOBAL
// =========================================================
let currentTransactions = [];
let currentCards = [];
let editingTransactionId = null;
let editingCardId = null;

const bankNamesMap = {
  nubank: "Nubank",
  inter: "Inter",
  c6: "C6 Bank",
  mercado_pago: "Mercado Pago",
  picpay: "PicPay",
  neon: "Neon",
  santander: "Santander",
  itau: "Itaú",
  bradesco: "Bradesco",
  banco_do_brasil: "Banco do Brasil",
  caixa: "Caixa",
};

// =========================================================
// INICIALIZAÇÃO E NAVEGAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupUserProfile();
  setupPdfExport();
  setupWindowControls();

  const monthFilter = document.getElementById("month-filter");
  const today = new Date();
  monthFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  monthFilter.addEventListener("change", () => {
    loadTransactions();
    loadSummary();
  });

  await loadCards();
  await loadTransactions();
  await loadSummary();
  await loadEvolutionData();

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
    Object.values(views).forEach((el) => el.classList.add("d-none"));
    Object.values(links).forEach((el) => {
      el.classList.remove("active");
      const icon = el.querySelector("i");
      if (icon) icon.className = icon.className.replace("-fill", "");
    });

    views[viewName].classList.remove("d-none");
    links[viewName].classList.add("active");

    const activeIcon = links[viewName].querySelector("i");
    if (activeIcon) {
      const iconClass = Array.from(activeIcon.classList).find(
        (c) => c.startsWith("bi-") && c !== "bi",
      );
      if (iconClass && !iconClass.includes("-fill")) {
        activeIcon.classList.replace(iconClass, iconClass + "-fill");
      }
    }
  };

  Object.keys(links).forEach((key) => {
    links[key].addEventListener("click", (e) => {
      e.preventDefault();
      switchView(key);
    });
  });
}

function setupWindowControls() {
  const btnMinimize = document.getElementById("btn-minimize");
  const btnMaximize = document.getElementById("btn-maximize");
  const btnClose = document.getElementById("btn-close");

  if (btnMinimize)
    btnMinimize.addEventListener("click", () => window.api.windowMinimize());

  if (btnMaximize) {
    btnMaximize.addEventListener("click", () => {
      window.api.windowMaximize();
      const icon = btnMaximize.querySelector("i");
      if (icon.classList.contains("bi-square")) {
        icon.classList.replace("bi-square", "bi-front");
      } else {
        icon.classList.replace("bi-front", "bi-square");
      }
    });
  }

  if (btnClose)
    btnClose.addEventListener("click", () => window.api.windowClose());
}

async function setupUserProfile() {
  const btnEditUser = document.querySelector(".edit-user-btn");
  const userInfoDiv = document.querySelector(".user-info");
  const userNameSpan = document.querySelector(".user-info span");

  const savedName = await window.api.getSetting("orion_user_name");
  if (savedName) userNameSpan.textContent = `Olá, ${savedName}`;

  btnEditUser.addEventListener("click", async (e) => {
    e.preventDefault();
    const existingInput = userInfoDiv.querySelector("input");

    if (existingInput) {
      const newName = existingInput.value.trim();
      if (newName) {
        userNameSpan.textContent = `Olá, ${newName}`;
        await window.api.saveSetting("orion_user_name", newName);
      }
      userNameSpan.classList.remove("d-none");
      existingInput.remove();
      btnEditUser.innerHTML = '<i class="bi bi-pencil-square"></i>';
    } else {
      const currentName = userNameSpan.textContent.replace("Olá, ", "");
      userNameSpan.classList.add("d-none");

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentName;
      input.className = "profile-edit-input";

      userInfoDiv.appendChild(input);
      input.focus();

      btnEditUser.innerHTML = '<i class="bi bi-check-lg text-success"></i>';

      input.addEventListener("keypress", (k) => {
        if (k.key === "Enter") btnEditUser.click();
      });
    }
  });
}

// ==========================================
// RESET DE AÇÕES EM MASSA
// ==========================================
function resetBulkActions() {
  const btnBulkDelete = document.getElementById("btn-bulk-delete");
  const selectAllCheckbox = document.getElementById("select-all");
  const selectedCountSpan = document.getElementById("selected-count");

  if (btnBulkDelete) btnBulkDelete.classList.add("d-none");
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  if (selectedCountSpan) selectedCountSpan.innerText = "0";
}

// =========================================================
// TRANSAÇÕES (DASHBOARD)
// =========================================================

async function loadTransactions() {
  const period = document.getElementById("month-filter").value;
  currentTransactions = await window.api.searchTransaction(period);

  const tbody = document.getElementById("lista-transacoes");
  const icons = {
    others: "📦",
    food: "🍔",
    home: "🏠",
    transport: "🚗",
    leisure: "🎉",
    work: "💼",
  };

  const htmlContent = currentTransactions
    .map((t) => {
      const cat = t.category || "others";
      const icon = icons[cat] || "📦";
      const colorClass = t.type === "income" ? "text-income" : "text-expense";
      const sign = t.type === "income" ? "+" : "-";
      let paymentBadge = `<span class="badge-payment badge-payment-cash">DINHEIRO / PIX</span>`;

      if (t.card_id) {
        const cardUsed = currentCards.find(
          (c) => String(c.id) === String(t.card_id),
        );
        if (cardUsed) {
          const bankName = cardUsed.bank_color
            ? cardUsed.bank_color.toUpperCase().replace(/_/g, " ")
            : "CARTÃO";
          const bankClass = cardUsed.bank_color
            ? `badge-${cardUsed.bank_color}`
            : "badge-payment-cash";
          paymentBadge = `<span class="badge-payment ${bankClass}">${bankName}</span>`;
        }
      }

      return `
      <tr>
        <td class="col-checkbox text-center"><input type="checkbox" class="row-checkbox" value="${t.id}"></td>
        <td>
            <div class="desc-wrapper">
                <span class="icon-large">${icon}</span>
                <div class="desc-text-col">
                   <span>${t.description}</span>
                   ${paymentBadge}
                </div>
            </div>
        </td>
        <td class="amount-col ${colorClass} font-bold">${sign} <span class="privacy-sensitive">${formatCurrency(t.amount)}</span></td>
        <td>${new Date(t.date).toLocaleDateString("pt-BR")}</td>
        <td class="text-center">
          <button class="btn-edit btn-action-edit" data-id="${t.id}" type="button"><i class="bi bi-pen"></i></button>
          <button class="btn-delete btn-action-delete" data-id="${t.id}" type="button"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`;
    })
    .join("");

  tbody.innerHTML = htmlContent;
  setupCheckboxEvents();
  renderCategoryChart(currentTransactions);
  renderDailyChart(currentTransactions);
  resetBulkActions();
}

async function loadSummary() {
  const period = document.getElementById("month-filter").value;
  const summary = await window.api.getSummary(period);

  document.getElementById("saldo").innerHTML =
    `R$ <span class="privacy-sensitive">${formatCurrency(summary.balance).replace("R$", "").trim()}</span>`;
  document.getElementById("entradas").innerHTML =
    `+ R$ <span class="privacy-sensitive">${formatCurrency(summary.inflow || 0)
      .replace("R$", "")
      .trim()}</span>`;
  document.getElementById("saidas").innerHTML =
    `- R$ <span class="privacy-sensitive">${formatCurrency(summary.outflow || 0)
      .replace("R$", "")
      .trim()}</span>`;

  document.getElementById("saldo").className = "value";
  document.getElementById("entradas").className = "value text-income";
  document.getElementById("saidas").className = "value text-expense";
}

async function loadEvolutionData() {
  const months = getLast6Months();
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

  renderEvolutionChart(labels, incomes, expenses);
}

document.getElementById("save-button").addEventListener("click", async (e) => {
  e.preventDefault();
  const descInput = document.getElementById("description");
  const valueInput = document.getElementById("amount");
  const typeInput = document.getElementById("type");
  const catInput = document.getElementById("category");
  const paymentMethodInput = document.getElementById("payment-method");

  if (!descInput.value.trim()) return setInputError(descInput);
  if (!valueInput.value) return setInputError(valueInput);

  const valueTyped = Number(valueInput.value);
  const transactionType = typeInput.value;
  const cardId = paymentMethodInput.value;

  if (transactionType === "expense" && cardId) {
    const usedCard = currentCards.find((c) => String(c.id) === String(cardId));

    if (usedCard) {
      if (usedCard.card_type === "Débito") {
        if (valueTyped > usedCard.account_balance) {
          await showCustomModal(
            "Poxa, saldo insuficiente",
            `O valor de R$ ${valueTyped.toFixed(2)} é maior que o saldo disponível nesta conta.`,
            "Entendi",
            "Voltar",
            "sad",
          );
          return;
        }
      } else if (usedCard.card_type === "Crédito") {
        let expensesInthisMonth = currentTransactions
          .filter(
            (t) =>
              String(t.card_id) === String(usedCard.id) && t.type === "expense",
          )
          .reduce((acc, t) => acc + Number(t.amount), 0);

        if (editingTransactionId) {
          const transactionOld = currentTransactions.find(
            (t) => String(t.id) === String(editingTransactionId),
          );
          if (transactionOld)
            expensesInthisMonth -= Number(transactionOld.amount);
        }

        const limitAvailable =
          Number(usedCard.limit_value) - expensesInthisMonth;

        if (valueTyped > limitAvailable) {
          await showCustomModal(
            "Limite estourado",
            `Parece que essa compra de R$ ${valueTyped.toFixed(2)} ultrapassa o limite disponível no cartão.`,
            "Entendi",
            "Voltar",
            "sad",
          );
          return;
        }
      }
    }
  }

  const now = new Date();
  const localIsoString = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, -1);

  const data = {
    value: Number(valueInput.value),
    description: descInput.value,
    type: typeInput.value,
    category: catInput.value,
    card_id: paymentMethodInput.value ? Number(paymentMethodInput.value) : null,
    data: localIsoString,
  };

  let result = editingTransactionId
    ? await window.api.updateTransaction(editingTransactionId, data)
    : await window.api.saveTransaction(data);

  if (result.success) {
    descInput.value = "";
    valueInput.value = "";
    paymentMethodInput.value = "";
    editingTransactionId = null;

    const btn = document.getElementById("save-button");
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Confirmar Transação';
    btn.classList.remove("edit-mode");

    await loadTransactions();
    await loadSummary();
    await loadEvolutionData();
    await loadCards();

    document
      .querySelector(".transactions-list")
      .scrollIntoView({ behavior: "smooth" });
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
        (item) => String(item.id) === String(btnEdit.dataset.id),
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
  document.getElementById("payment-method").value = t.card_id || "";
  editingTransactionId = t.id;

  const btnSave = document.getElementById("save-button");
  btnSave.innerHTML = '<i class="bi bi-check-circle"></i> Atualizar Transação';
  btnSave.classList.add("edit-mode");
  document.querySelector(".form").scrollIntoView({ behavior: "smooth" });
}

async function deleteItem(id) {
  if (
    await showCustomModal(
      "Apagar transação?",
      "Tem certeza? Esta ação removerá o registro e afetará o saldo do seu Dashboard.",
      "Sim, apagar",
      "Manter",
      "danger",
    )
  ) {
    await window.api.deleteTransaction(id);
    loadTransactions();
    loadSummary();
    loadEvolutionData();
  }
}

function setupCheckboxEvents() {
  const selectAll = document.getElementById("select-all");
  const rowCheckboxes = document.querySelectorAll(".row-checkbox");
  const btnBulk = document.getElementById("btn-bulk-delete");

  const updateBulkBtn = () => {
    const count = document.querySelectorAll(".row-checkbox:checked").length;
    if (count > 0) {
      btnBulk.classList.remove("d-none");
      document.getElementById("selected-count").textContent = count;
    } else {
      btnBulk.classList.add("d-none");
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
      (await showCustomModal(
        "Apagar Transações?",
        "Tem certeza? Esta ação removerá os registros selecionados e afetará o saldo do seu Dashboard.",
        "Sim, apagar",
        "Manter",
        "danger",
      ))
    ) {
      for (const cb of selected) await window.api.deleteTransaction(cb.value);
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
  const mainCreditId = await window.api.getSetting("orion_main_credit_card");
  const mainDebitId = await window.api.getSetting("orion_main_debit_card");

  let mainCreditCard = currentCards.find(
    (c) => String(c.id) === String(mainCreditId),
  );

  let totalLimit = currentCards.reduce(
    (acc, c) => acc + Number(c.limit_value || 0),
    0,
  );
  document.getElementById("total-limit-display").innerHTML =
    `R$ <span class="privacy-sensitive">${formatCurrency(totalLimit).replace("R$", "").trim()}</span>`;

  let totalBalance = currentCards.reduce(
    (acc, c) => acc + Number(c.account_balance || 0),
    0,
  );
  document.getElementById("total-balance-display").innerHTML =
    `R$ <span class="privacy-sensitive">${formatCurrency(totalBalance).replace("R$", "").trim()}</span>`;

  document.getElementById("total-cards-display").textContent =
    currentCards.length;

  const bestDayDisplay = document.getElementById("best-day-display");
  if (mainCreditCard && mainCreditCard.day_expiry) {
    const diaFechamento = String(mainCreditCard.day_expiry).padStart(2, "0");
    bestDayDisplay.textContent = `Dia ${diaFechamento}`;
  } else {
    bestDayDisplay.textContent = `--`;
  }

  let cardsHtml = `
    <div class="card-add-ghost btn-open-add-card">
      <i class="bi bi-plus-lg"></i><span>Novo Cartão</span>
    </div>`;

  const hiddenGroup = `<div class="dots-group"><i class="bi bi-asterisk"></i><i class="bi bi-asterisk"></i><i class="bi bi-asterisk"></i><i class="bi bi-asterisk"></i></div>`;

  currentCards.forEach((card) => {
    let bgClass = bankColors[card.bank_color] || "card-black";
    let styleAttr = bgClass.includes("background:") ? `style="${bgClass}"` : "";
    bgClass = bgClass.includes("background:")
      ? "credit-card card-with-actions"
      : `credit-card card-with-actions ${bgClass}`;

    const isMainCredit = String(card.id) === String(mainCreditId);
    const isMainDebit = String(card.id) === String(mainDebitId);

    let starIcon = "bi-star";
    let hoverClass =
      card.card_type === "Débito" ? "hover-blue" : "hover-yellow";
    let starTitle = "Definir como Principal";

    if (isMainCredit && isMainDebit) {
      starIcon = "bi-star-fill";
      hoverClass = "hover-yellow";
      starTitle = "Principal (Crédito e Débito)";
    } else if (isMainCredit) {
      starIcon = "bi-star-fill";
      hoverClass = "hover-yellow";
      starTitle = "Principal de Crédito";
    } else if (isMainDebit) {
      starIcon = "bi-star-fill";
      hoverClass = "hover-blue";
      starTitle = "Principal de Débito";
    }

    const tipo = card.card_type ? card.card_type.toUpperCase() : "CRÉDITO";
    const typeBadge = `<span class="card-type-badge">${tipo}</span>`;

    let detailsHtml = "";
    let limitHtml = "";

    if (tipo === "DÉBITO") {
      detailsHtml = `
        <div><span class="card-label">TITULAR</span><br><strong>${card.name.toUpperCase()}</strong></div>
        <div class="text-right"><span class="card-label">CONTA</span><br><strong>${(card.account_type || "CORRENTE").toUpperCase()}</strong></div>`;
      limitHtml = `<span>Saldo Atual</span><strong><span class="privacy-sensitive">${formatCurrency(card.account_balance || 0)}</span></strong>`;
    } else if (tipo === "CRÉDITO") {
      detailsHtml = `
        <div><span class="card-label">TITULAR</span><br><strong>${card.name.toUpperCase()}</strong></div>
        <div class="text-right"><span class="card-label">FECHAMENTO</span><br><strong>Dia ${String(card.day_expiry).padStart(2, "0")}</strong></div>`;
      limitHtml = `<span>Limite Total</span><strong><span class="privacy-sensitive">${formatCurrency(card.limit_value)}</span></strong>`;
    }

    cardsHtml += `
      <div class="${bgClass}" ${styleAttr}>
          <div class="card-actions-sidebar">
              <i class="bi ${starIcon} btn-star-card ${hoverClass}" data-id="${card.id}" title="${starTitle}"></i>
              <i class="bi bi-pencil-square btn-edit-card" data-id="${card.id}" title="Editar"></i>
              <i class="bi bi-trash3-fill btn-delete-card" data-id="${card.id}" title="Excluir"></i>
          </div>
          <div class="card-top-header">
              <span class="card-chip"></span>
              <span class="card-logo nowrap"><i class="bi bi-bank"></i> ${card.bank_color?.toUpperCase().replaceAll("_", " ") || "BANK"}</span>
              ${typeBadge} 
          </div>
          <div class="card-number">
             ${hiddenGroup}${hiddenGroup}${hiddenGroup}
             <span class="visible-digits">${card.last_digits}</span>
          </div>
          <div class="card-details">
              ${detailsHtml}
          </div>
          <div class="card-footer-box">
              ${limitHtml}
          </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml;
  populatePaymentMethods(mainCreditId, mainDebitId);
}

function populatePaymentMethods(mainCreditId, mainDebitId) {
  const select = document.getElementById("payment-method");
  if (!select) return;

  const currentValue = select.value;
  let optionsHtml = '<option value="">💵 Dinheiro</option>';

  currentCards.forEach((card) => {
    const bankName = bankNamesMap[card.bank_color] || "Cartão";
    const isMain =
      String(card.id) === String(mainCreditId) ||
      String(card.id) === String(mainDebitId);
    const emoji = isMain ? "⭐" : "💳";
    optionsHtml += `<option value="${card.id}">${emoji} ${bankName} (Final ${card.last_digits})</option>`;
  });

  select.innerHTML = optionsHtml;
  select.value = currentValue;
}

function initCardEvents() {
  const container = document.getElementById("cards-container");
  container.addEventListener("click", async (event) => {
    const btnEdit = event.target.closest(".btn-edit-card");
    const btnDelete = event.target.closest(".btn-delete-card");
    const btnAdd = event.target.closest(".btn-open-add-card");
    const btnStar = event.target.closest(".btn-star-card");

    if (btnAdd) openNewCardModal();
    if (btnDelete) removeCard(btnDelete.dataset.id);
    if (btnEdit) {
      const card = currentCards.find(
        (c) => String(c.id) === String(btnEdit.dataset.id),
      );
      if (card) startEditCard(card);
    }

    if (btnStar) {
      const id = btnStar.dataset.id;
      const card = currentCards.find((c) => String(c.id) === String(id));
      const tipo = card.card_type ? card.card_type.toUpperCase() : "CRÉDITO";
      const currentMainCredit = await window.api.getSetting(
        "orion_main_credit_card",
      );
      const currentMainDebit = await window.api.getSetting(
        "orion_main_debit_card",
      );

      if (tipo === "CRÉDITO") {
        if (String(id) === String(currentMainCredit)) return;
        if (
          await showCustomModal(
            "Novo favorito?",
            "Deseja que este seja o seu cartão padrão para novas compras no Crédito?",
            "Sim, favoritar",
            "Ainda não",
            "question",
          )
        ) {
          await window.api.saveSetting("orion_main_credit_card", String(id));
          loadCards();
        }
      } else if (tipo === "DÉBITO") {
        if (String(id) === String(currentMainDebit)) return;
        if (
          await showCustomModal(
            "Novo favorito?",
            "Deseja que este seja o seu cartão padrão para novas compras no Débito?",
            "Sim, favoritar",
            "Ainda não",
            "question",
          )
        ) {
          await window.api.saveSetting("orion_main_debit_card", String(id));
          loadCards();
        }
      }
    }
  });
}

function toggleCardInputs() {
  const tipo = document.getElementById("card-type").value;
  const rowCredit = document.getElementById("row-credit");
  const rowDebit = document.getElementById("row-debit");
  const limitInput = document.getElementById("card-limit");
  const expiryInput = document.getElementById("card-expiry");
  const balanceInput = document.getElementById("debit-balance");

  if (tipo === "Débito") {
    rowCredit.classList.add("d-none");
    rowDebit.classList.remove("d-none");
    limitInput.required = false;
    expiryInput.required = false;
    balanceInput.required = true;
  } else if (tipo === "Crédito") {
    rowCredit.classList.remove("d-none");
    rowDebit.classList.add("d-none");
    limitInput.required = true;
    expiryInput.required = true;
    balanceInput.required = false;
  }
}

document.getElementById("btn-close-card-modal").onclick = () => {
  document.getElementById("card-modal").classList.remove("show-modal");
};

document
  .getElementById("card-type")
  .addEventListener("change", toggleCardInputs);

function openNewCardModal() {
  editingCardId = null;
  document.getElementById("card-form").reset();
  document.getElementById("card-type").value = "Crédito";
  toggleCardInputs();
  document.querySelector("#card-modal h3").textContent = "Novo Cartão";
  document.getElementById("card-modal").classList.add("show-modal");
}

function startEditCard(card) {
  document.getElementById("card-name").value = card.name;
  document.getElementById("card-last-digits").value = card.last_digits;
  document.getElementById("card-bank").value = card.bank_color;
  document.getElementById("card-type").value = card.card_type || "Crédito";

  toggleCardInputs();

  document.getElementById("card-limit").value = card.limit_value;
  document.getElementById("card-expiry").value = card.day_expiry;
  document.getElementById("debit-balance").value = card.account_balance || 0;
  document.getElementById("debit-type").value = card.account_type || "Corrente";

  editingCardId = card.id;
  document.querySelector("#card-modal h3").textContent = "Editar Cartão";
  document.getElementById("card-modal").classList.add("show-modal");
}

document.getElementById("card-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipo = document.getElementById("card-type").value;
  const isDebit = tipo === "Débito";
  const isCredit = tipo === "Crédito";

  const data = {
    name: document.getElementById("card-name").value,
    lastDigits: document.getElementById("card-last-digits").value,
    bankColor: document.getElementById("card-bank").value,
    type: tipo,
    limit: isDebit ? 0 : Number(document.getElementById("card-limit").value),
    expiry: isDebit ? "1" : document.getElementById("card-expiry").value,
    balance: isCredit
      ? 0
      : Number(document.getElementById("debit-balance").value),
    accType: isCredit
      ? "Corrente"
      : document.getElementById("debit-type").value,
  };

  let res = editingCardId
    ? await window.api.updateCard(editingCardId, data)
    : await window.api.saveCard(data);
  if (res.success) {
    document.getElementById("card-modal").classList.remove("show-modal");
    loadCards();
  }
});

async function removeCard(id) {
  if (
    await showCustomModal(
      "Remover da carteira?",
      "Ao excluir este cartão, ele não estará mais disponível para novas transações. Deseja continuar?",
      "Sim, excluir",
      "Manter cartão",
      "danger",
    )
  ) {
    await window.api.deleteCard(id);
    loadCards();
  }
}

// =========================================================
// RELATÓRIOS
// =========================================================

let activeReportKey = null;

async function loadReportView(start, end, type, isNewSearch = true) {
  if (!start || !end) return;

  const reportKey = `${start}|${end}|${type}`;

  if (
    !isNewSearch &&
    activeReportKey === reportKey &&
    !document.getElementById("report-content").classList.contains("d-none")
  ) {
    document.getElementById("report-content").classList.add("d-none");
    document.getElementById("btn-export-pdf").classList.add("d-none");
    activeReportKey = null;
    document
      .querySelectorAll(".history-card")
      .forEach((c) => c.classList.remove("active-history"));
    return;
  }

  if (isNewSearch) await saveReportToHistory(start, end, type);
  activeReportKey = reportKey;

  const endQuery = end + "T23:59:59.999Z";
  const data = await window.api.getReportData(start, endQuery);
  let filtered = data.transactions;
  if (type !== "all") filtered = filtered.filter((t) => t.type === type);

  const { inflow, outflow, balance } = data.summary;
  const tbody = document.getElementById("report-table-body");
  const icons = {
    others: "📦",
    food: "🍔",
    home: "🏠",
    transport: "🚗",
    leisure: "🎉",
    work: "💼",
  };

  tbody.innerHTML = filtered
    .map((t) => {
      const cat = t.category || "others";
      const info = categoryMap[cat] || categoryMap.others;
      const colorClass = t.type === "income" ? "text-income" : "text-expense";
      return `
      <tr>
        <td>${new Date(t.date).toLocaleDateString("pt-BR")}</td>
        <td><span class="category-badge badge-${cat}">${icons[cat] || "📦"} ${info.label}</span></td>
        <td>${t.description}</td>
        <td class="${colorClass} font-bold">${t.type === "income" ? "+" : "-"} ${formatCurrency(t.amount)}</td>
      </tr>`;
    })
    .join("");

  document.getElementById("report-summary-area").innerHTML = `
    <div class="summary-col">
      <div class="summary-card border-income"><h3 class="summary-label">Entradas</h3><p class="summary-value income">${formatCurrency(inflow)}</p></div>
      <div class="summary-card border-expense"><h3 class="summary-label">Saídas</h3><p class="summary-value expense">${formatCurrency(outflow)}</p></div>
      <div class="summary-card border-balance"><h3 class="summary-label">Saldo Líquido</h3><p class="summary-value balance">${formatCurrency(balance)}</p></div>
    </div>
    <div class="report-chart-box"><h3 class="report-chart-title">Distribuição de Gastos</h3><div class="report-chart-wrapper"><canvas id="report-chart"></canvas></div></div>
  `;

  renderReportChart(filtered);

  document.getElementById("report-summary-area").classList.remove("d-none");
  document.getElementById("report-content").classList.remove("d-none");
  document.getElementById("btn-export-pdf").classList.remove("d-none");

  const labelMap = {
    all: "Todas",
    income: "Apenas Entradas",
    expense: "Apenas Saídas",
  };
  document.getElementById("report-period-label").textContent =
    `Período: ${new Date(start).toLocaleDateString("pt-BR")} até ${new Date(end).toLocaleDateString("pt-BR")} (${labelMap[type]})`;

  document.querySelectorAll(".history-card").forEach((c) => {
    const cKey = `${c.dataset.start}|${c.dataset.end}|${c.dataset.type}`;
    c.classList.toggle("active-history", cKey === activeReportKey);
  });
}

document
  .getElementById("btn-generate-report")
  .addEventListener("click", async () => {
    const start = document.getElementById("report-start").value;
    const end = document.getElementById("report-end").value;
    const type = document.getElementById("report-type").value;

    if (!start || !end) {
      setInputError(document.getElementById("report-start"));
      setInputError(document.getElementById("report-end"));
      return;
    }
    await loadReportView(start, end, type, true);
  });

async function saveReportToHistory(start, end, type) {
  await window.api.saveReportHistory({ start, end, type });
  await renderReportHistory();
}

async function renderReportHistory() {
  const history = await window.api.getReportHistory();
  const container = document.getElementById("history-list");

  if (history.length === 0) {
    container.innerHTML =
      '<p class="text-muted-italic w-100">Nenhum histórico recente.</p>';
    return;
  }

  const types = { all: "Todas", income: "Entradas", expense: "Saídas" };

  container.innerHTML = history
    .map((item) => {
      const itemKey = `${item.start_date}|${item.end_date}|${item.type}`;
      const activeClass =
        itemKey === activeReportKey &&
        !document.getElementById("report-content").classList.contains("d-none")
          ? "active-history"
          : "";
      return `
      <div class="history-card ${activeClass}" data-start="${item.start_date}" data-end="${item.end_date}" data-type="${item.type}">
        <div class="history-card-header"><i class="bi bi-file-earmark-text"></i> <small>Visualizar</small></div>
        <div class="history-period">${new Date(item.start_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })} - ${new Date(item.end_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
        <div class="history-type">${types[item.type]}</div>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".history-card").forEach((card) => {
    card.addEventListener("click", async () => {
      document.getElementById("report-start").value = card.dataset.start;
      document.getElementById("report-end").value = card.dataset.end;
      document.getElementById("report-type").value = card.dataset.type;
      await loadReportView(
        card.dataset.start,
        card.dataset.end,
        card.dataset.type,
        false,
      );
    });
  });
}

window.clearReportHistory = async function () {
  if (
    await showCustomModal(
      "Limpar histórico?",
      "Isso apagará seus atalhos de relatórios recentes. Deseja continuar?",
      "Sim, limpar",
      "Cancelar",
      "danger",
    )
  ) {
    await window.api.clearReportHistory();
    await renderReportHistory();
    document.getElementById("report-content").classList.add("d-none");
    document.getElementById("btn-export-pdf").classList.add("d-none");
    activeReportKey = null;
  }
};
