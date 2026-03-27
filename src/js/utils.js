// =========================================================
// DADOS CONSTANTES
// =========================================================

const categoryMap = {
  food: { label: "Alimentação", color: "#e74c3c" },
  home: { label: "Casa", color: "#3498db" },
  transport: { label: "Transporte", color: "#f1c40f" },
  leisure: { label: "Lazer", color: "#9b59b6" },
  work: { label: "Trabalho", color: "#2ecc71" },
  others: { label: "Outros", color: "#95a5a6" },
};

const bankColors = {
  nubank: "card-purple",
  inter: "card-orange",
  c6: "card-carbon",
  mercado_pago: "card-black",
  picpay: "card-green",
  neon: "card-light-blue",
  santander: "card-red",
  itau: "card-dark-orange",
  bradesco: "card-dark-red",
  banco_do_brasil: "card-dark-blue",
  caixa: "card-blue",
};

// =========================================================
// FORMATADORES E CALCULADORAS
// =========================================================

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDateInput = (date) => {
  return date.toISOString().split("T")[0];
};

// Retorna array com os últimos 6 meses (ex: ['2026-01', '2025-12'])
const getLast6Months = () => {
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
  }
  return months;
};

// =========================================================
// MODAIS E CONTROLE DE INTERFACE
// =========================================================

// Controle de Privacidade
document.addEventListener("DOMContentLoaded", () => {
  const togglePrivacyBtn = document.getElementById("toggle-privacy");
  const privacyIcon = document.getElementById("privacy-icon");

  if (!togglePrivacyBtn || !privacyIcon) return;

  let isPrivacyMode = localStorage.getItem("privacyMode") === "true";

  const applyPrivacyState = () => {
    if (isPrivacyMode) {
      document.body.classList.add("privacy-mode");
      privacyIcon.className = "bi bi-eye-slash";
    } else {
      document.body.classList.remove("privacy-mode");
      privacyIcon.className = "bi bi-eye";
    }
  };

  applyPrivacyState();

  togglePrivacyBtn.addEventListener("click", () => {
    isPrivacyMode = !isPrivacyMode;
    localStorage.setItem("privacyMode", isPrivacyMode);
    applyPrivacyState();
  });
});

// Modal Genérico (Promise-based)
function showCustomModal(
  title = "Tem certeza?",
  text = "Essa ação não pode ser desfeita.",
  confirmText = "Sim, excluir",
  cancelText = "Cancelar",
  type = "danger",
) {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-modal");
    const btnConfirm = document.getElementById("btn-confirm-modal");
    const btnCancel = document.getElementById("btn-cancel-modal");
    const modalIcon = modal.querySelector(".modal-header i");

    modal.querySelector("h3").textContent = title;
    modal.querySelector("p").textContent = text;
    btnConfirm.textContent = confirmText;
    btnCancel.textContent = cancelText;

    modalIcon.className = "bi";
    if (type === "success") {
      btnConfirm.className = "btn-success";
      modalIcon.classList.add("bi-check-circle-fill", "text-success");
    } else if (type === "sad") {
      btnConfirm.className = "btn-sad";
      modalIcon.classList.add("bi-emoji-frown-fill", "text-sad");
    } else if (type === "question") {
      btnConfirm.className = "btn-question";
      modalIcon.classList.add("bi-question-circle-fill", "text-question");
    } else {
      btnConfirm.className = "btn-danger";
      modalIcon.classList.add("bi-exclamation-triangle-fill", "text-danger");
    }

    modal.classList.add("show-modal");

    const closeModal = (result) => {
      modal.classList.remove("show-modal");
      btnConfirm.onclick = null;
      btnCancel.onclick = null;
      modal.onclick = null;
      resolve(result);
    };

    btnConfirm.onclick = () => closeModal(true);
    btnCancel.onclick = () => closeModal(false);

    // Fecha ao clicar fora
    modal.onclick = (e) => {
      if (e.target === modal) closeModal(false);
    };
  });
}

// =========================================================
// HELPERS DE VALIDAÇÃO
// =========================================================

const setInputError = (input) => {
  input.classList.add("input-error");
  input.addEventListener("input", () => input.classList.remove("input-error"), {
    once: true,
  });
};
