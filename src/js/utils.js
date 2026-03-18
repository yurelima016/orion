// --- DADOS CONSTANTES ---
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

// --- FORMATADORES ---
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

    if (type === "success") {
      // Tema VERDE (Para favoritar, salvar)
      btnConfirm.className = "btn-success";
      modalIcon.className = "bi bi-check-circle-fill";
      modalIcon.style.color = "#2ecc71";
    } else {
      // Tema VERMELHO (Padrão para excluir)
      btnConfirm.className = "btn-danger";
      modalIcon.className = "bi bi-exclamation-triangle-fill"; // Ícone de Alerta
      modalIcon.style.color = "#f1c40f";
    }

    modal.style.display = "flex";

    const closeModal = (result) => {
      modal.style.display = "none";
      // Limpa eventos para não acumular
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

// Helper para validação de input
const setInputError = (input) => {
  input.classList.add("input-error");
  input.addEventListener("input", () => input.classList.remove("input-error"), {
    once: true,
  });
};
