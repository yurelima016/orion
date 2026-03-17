// Instâncias Globais dos Gráficos
let categoryChartInstance = null;
let dailyChartInstance = null;
let reportChartInstance = null;
let evolutionChartInstance = null;

// Gráfico de Barras (Categorias)
function renderCategoryChart(transactions) {
  const ctx = document.getElementById("category-chart");
  const expenses = transactions.filter((t) => t.type === "expense");

  const totalsByCategory = expenses.reduce((acc, curr) => {
    const cat = curr.category || "others";
    acc[cat] = (acc[cat] || 0) + Number(curr.amount);
    return acc;
  }, {});

  const labels = [];
  const dataValues = [];
  const backgroundColors = [];

  for (const [key, value] of Object.entries(totalsByCategory)) {
    const info = categoryMap[key] || categoryMap["others"];
    labels.push(info.label);
    dataValues.push(value);
    backgroundColors.push(info.color);
  }

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Gastos (R$)",
          data: dataValues,
          backgroundColor: backgroundColors,
          borderRadius: 5,
          borderSkipped: "bottom",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
        x: { grid: { display: false } },
      },
    },
  });
}

// Gráfico de Barras (Diário)
function renderDailyChart(transactions) {
  const ctx = document.getElementById("daily-chart");
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const dailyTotals = new Array(31).fill(0);

  transactions.forEach((t) => {
    if (t.type === "expense") {
      const dateObj = new Date(t.date);
      const day = dateObj.getUTCDate();
      if (day >= 1 && day <= 31) dailyTotals[day - 1] += Number(t.amount);
    }
  });

  if (dailyChartInstance) dailyChartInstance.destroy();

  dailyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: daysInMonth,
      datasets: [
        {
          label: "Gasto no Dia",
          data: dailyTotals,
          backgroundColor: "#e74c3c",
          borderRadius: 4,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
  });
}

// Gráfico de Linha (Evolução)
function renderEvolutionChart(labels, incomes, expenses) {
  const ctx = document.getElementById("evolution-chart");

  if (evolutionChartInstance) evolutionChartInstance.destroy();

  evolutionChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Receitas",
          data: incomes,
          borderColor: "#27ae60",
          backgroundColor: "rgba(39, 174, 96, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Despesas",
          data: expenses,
          borderColor: "#c0392b",
          backgroundColor: "rgba(192, 57, 43, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// Gráfico de Rosca (Relatório)
function renderReportChart(transactions) {
  const ctx = document.getElementById("report-chart");
  const expenses = transactions.filter((t) => t.type === "expense");

  if (expenses.length === 0) {
    if (reportChartInstance) reportChartInstance.destroy();
    return;
  }

  const totals = expenses.reduce((acc, curr) => {
    const cat = curr.category || "others";
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});

  const labels = Object.keys(totals).map(
    (k) => categoryMap[k]?.label || "Outros"
  );
  const dataValues = Object.values(totals);
  const colors = Object.keys(totals).map(
    (k) => categoryMap[k]?.color || "#95a5a6"
  );

  if (reportChartInstance) reportChartInstance.destroy();

  reportChartInstance = new Chart(ctx, {
    type: "doughnut",
    plugins: [ChartDataLabels],
    data: {
      labels: labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { boxWidth: 12, font: { size: 11 } },
        },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 12 },
          formatter: (value, ctx) => {
            let sum = 0;
            ctx.chart.data.datasets[0].data.map((data) => (sum += data));
            let percentage = ((value * 100) / sum).toFixed(1) + "%";
            if ((value * 100) / sum < 5) return "";
            return percentage;
          },
        },
      },
      cutout: "60%",
      layout: { padding: 10 },
    },
  });
}
