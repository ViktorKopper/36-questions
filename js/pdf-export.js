// Minimal "export to PDF" via browser print.
// Creates a new window with a print-friendly conclusion layout and triggers print.
// NOTE: For hearts in the PDF, the user must enable "Background graphics" in the print dialog.
(function () {
  async function imgToDataUrl(imgUrl) {
    try {
      const res = await fetch(imgUrl, { cache: "force-cache" });
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildPrintCss(heartDataUrl) {
    const heartUrl = heartDataUrl || "./hand-drawn-heart-1.png";
    return `
      :root{
        --bg:#000;
        --ink: rgba(251, 207, 232, 0.95);
        --pink-2:#f472b6;
      }

      html, body { height: 100%; }
      body{
        margin:0;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        background: var(--bg);
        color: var(--ink);
      }

      /* Hearts background overlay */
      .bg-hearts{
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
      }
      .bg-hearts::before{
        content:"";
        position:absolute;
        inset:0;
        background-image: url("${heartUrl}");
        background-repeat: repeat;
        background-size: 220px 220px;
        opacity: 0.10;
        filter: brightness(1.15) saturate(1.4);
      }

      .wrap{
        position: relative;
        z-index: 1;
        padding: 28px 26px;
      }

      h1{
        margin: 0 0 6px;
        color: var(--pink-2);
        letter-spacing: 0.02em;
      }
      .sub{
        margin: 0 0 18px;
        opacity: 0.86;
      }

      .meta{
        display:flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 14px;
        font-size: 12px;
        opacity: 0.9;
      }
      .pill{
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(236,72,153,0.26);
        background: rgba(0,0,0,0.35);
      }

      .card{
        border-radius: 14px;
        border: 1px solid rgba(236,72,153,0.24);
        background: rgba(0,0,0,0.45);
        margin: 0 0 12px;
        overflow: hidden;
      }

      .card-head{
        padding: 10px 12px;
        border-bottom: 1px solid rgba(236,72,153,0.18);
      }
      .qnum{
        font-weight: 800;
        color: var(--pink-2);
      }
      .qtext{
        margin-top: 6px;
        opacity: 0.94;
        line-height: 1.35;
      }

      .grid{
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .col{
        padding: 10px 12px 12px;
      }
      .col + .col{
        border-left: 1px solid rgba(236,72,153,0.18);
      }
      .who{
        font-size: 12px;
        opacity: 0.82;
        margin: 0 0 6px;
      }
      .ans{
        white-space: pre-wrap;
        line-height: 1.35;
        font-size: 13px;
        margin: 0;
      }

      @media print{
        .wrap{ padding: 18mm 14mm; }
        .card{ break-inside: avoid; page-break-inside: avoid; }
      }
    `;
  }

  function buildPrintHtml({ title, subtitle, metaPills, items, includeQuestions }) {
    const meta = metaPills.map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("");

    const cards = items.map((it) => {
      const qHtml = includeQuestions
        ? `<div class="qtext">${escapeHtml(it.question)}</div>`
        : "";

      return `
        <section class="card">
          <div class="card-head">
            <div class="qnum">#${it.number} • Set ${it.set}</div>
            ${qHtml}
          </div>
          <div class="grid">
            <div class="col">
              <p class="who">${escapeHtml(it.nameA)}</p>
              <p class="ans">${escapeHtml(it.answerA || "")}</p>
            </div>
            <div class="col">
              <p class="who">${escapeHtml(it.nameB)}</p>
              <p class="ans">${escapeHtml(it.answerB || "")}</p>
            </div>
          </div>
        </section>
      `;
    }).join("");

    return `
      <div class="bg-hearts"></div>
      <div class="wrap">
        <h1>${escapeHtml(title)}</h1>
        <p class="sub">${escapeHtml(subtitle)}</p>
        <div class="meta">${meta}</div>
        ${cards || "<p>No items to export.</p>"}
      </div>
    `;
  }

  async function exportComparisonToPdf(payload) {
    const heartDataUrl = await imgToDataUrl("./hand-drawn-heart-1.png");
    const css = buildPrintCss(heartDataUrl);

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      alert("Popup blocked. Allow popups to export PDF.");
      return;
    }

    const baseHref = location.href.replace(/#.*$/, "");
    const html = buildPrintHtml(payload);

    win.document.open();
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(baseHref)}" />
  <title>${escapeHtml(payload.title || "36 Questions - Conclusion")}</title>
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`);
    win.document.close();
  }

  window.PDFExport = { exportComparisonToPdf };
})();
