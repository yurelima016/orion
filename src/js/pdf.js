function setupPdfExport() {
  const btnExport = document.getElementById("btn-export-pdf");

  if (!btnExport) return;

  btnExport.addEventListener("click", () => {
    const originalText = btnExport.innerHTML;
    const inputStart = document.getElementById("report-start");

    btnExport.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando...';
    document.body.style.cursor = "wait";

    const element = document.querySelector(".paper");
    const canvas = document.getElementById("report-chart");

    const img = document.createElement("img");
    if (canvas) {
      img.src = canvas.toDataURL("image/png", 1.0);
      img.style.width = "100%";
      img.style.display = "block";
      canvas.style.display = "none";
      canvas.parentNode.insertBefore(img, canvas);
    }

    // Configuração HTML2PDF
    const opt = {
      margin: 0,
      filename: `Relatorio_Financeiro_${inputStart.value || "Geral"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: {
        unit: "px",
        format: [800, element.offsetHeight + 50],
        orientation: "portrait",
      },
    };

    // Gerar PDF
    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        // Reverte
        if (canvas) {
          img.remove();
          canvas.style.display = "block";
        }
        btnExport.innerHTML = originalText;
        document.body.style.cursor = "default";
      })
      .catch((err) => {
        console.error("Erro PDF:", err);
        if (canvas && img.parentNode) {
          img.remove();
          canvas.style.display = "block";
        }
        btnExport.innerHTML = originalText;
        document.body.style.cursor = "default";
      });
  });
}
