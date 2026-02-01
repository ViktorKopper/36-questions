// End screen: side-by-side comparison + PDF export
(function () {
  const qs = window.Utils.qs;

  const endScreen = qs("end-screen");
  const gameLayout = qs("game-layout");

  const endSubtitle = qs("endSubtitle");
  const endStats = qs("endStats");
  const comparisonList = qs("comparisonList");

  const onlyBothLocked = qs("onlyBothLocked");
  const includeQuestions = qs("includeQuestions");

  const endBackBtn = qs("endBackBtn");
  const exportPdfBtn = qs("exportPdfBtn");
  const endResetBtn = qs("endResetBtn");

  function normalizeEntry(entry) {
    const v = entry || {};
    return {
      A: typeof v.A === "string" ? v.A : "",
      B: typeof v.B === "string" ? v.B : "",
    };
  }

  function normalizeLocks(lock) {
    const v = lock || {};
    if (typeof v.A === "boolean" || typeof v.B === "boolean") {
      return { A: { locked: !!v.A }, B: { locked: !!v.B } };
    }
    const a = (v.A && typeof v.A === "object") ? v.A : {};
    const b = (v.B && typeof v.B === "object") ? v.B : {};
    return { A: { locked: !!a.locked }, B: { locked: !!b.locked } };
  }

  function bothLocked(state, qid) {
    const l = normalizeLocks(state.locks?.[qid]);
    return !!(l.A.locked && l.B.locked);
  }

  function isNonEmpty(s) {
    return typeof s === "string" && s.trim().length > 0;
  }

  function getItems(state, questions) {
    const order = Array.isArray(state.order) && state.order.length ? state.order : questions.map(q => q.id);

    return order.map((qid, idx) => {
      const q = questions.find(x => x.id === qid);
      const entry = normalizeEntry(state.notes?.[qid]);
      const locked = bothLocked(state, qid);

      return {
        qid,
        number: idx + 1,
        set: q?.set || Math.floor(idx / 12) + 1,
        question: (q?.text || "").trim(),
        answerA: entry.A || "",
        answerB: entry.B || "",
        locked,
        hasA: isNonEmpty(entry.A),
        hasB: isNonEmpty(entry.B),
      };
    });
  }

  function renderStats(state, items) {
    const total = items.length;
    const lockedCount = items.filter(i => i.locked).length;
    const aWritten = items.filter(i => i.hasA).length;
    const bWritten = items.filter(i => i.hasB).length;

    const nameA = state.players?.A || "Player A";
    const nameB = state.players?.B || "Player B";

    endStats.innerHTML = `
      <div class="stat">Total questions: <b>${total}</b></div>
      <div class="stat">Fully revealed: <b>${lockedCount}</b></div>
      <div class="stat">${nameA} wrote: <b>${aWritten}</b></div>
      <div class="stat">${nameB} wrote: <b>${bWritten}</b></div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderList(state, questions) {
    const items = getItems(state, questions);
    renderStats(state, items);

    const filtered = items.filter((it) => {
      if (onlyBothLocked.checked) return it.locked;
      return it.hasA || it.hasB;
    });

    const showQ = includeQuestions.checked;

    const nameA = state.players?.A || "Player A";
    const nameB = state.players?.B || "Player B";

    endSubtitle.textContent = onlyBothLocked.checked
      ? "Only questions where both answers are locked (revealed)."
      : "All questions with at least one answer written.";

    comparisonList.innerHTML = filtered.map((it) => {
      const qHtml = showQ ? `<div class="compare-q">${escapeHtml(it.question)}</div>` : "";
      const aEmpty = !isNonEmpty(it.answerA) ? "empty" : "";
      const bEmpty = !isNonEmpty(it.answerB) ? "empty" : "";

      return `
        <section class="compare-card">
          <div class="compare-head">
            <div>
              <div class="compare-num">#${it.number} • Set ${it.set}</div>
              ${qHtml}
            </div>
          </div>
          <div class="compare-grid">
            <div class="compare-col">
              <p class="who">${escapeHtml(nameA)}</p>
              <p class="answer ${aEmpty}">${escapeHtml(it.answerA || "—")}</p>
            </div>
            <div class="compare-col">
              <p class="who">${escapeHtml(nameB)}</p>
              <p class="answer ${bEmpty}">${escapeHtml(it.answerB || "—")}</p>
            </div>
          </div>
        </section>
      `;
    }).join("");

    return { items, filtered };
  }

  function openEnd(state) {
    gameLayout.classList.add("hidden");
    endScreen.classList.remove("hidden");
    return renderList(state, window.questions || []);
  }

  function closeEnd() {
    endScreen.classList.add("hidden");
    gameLayout.classList.remove("hidden");
  }

  function bind(stateGetter) {
    const getState = stateGetter;

    onlyBothLocked.addEventListener("change", () => renderList(getState(), window.questions || []));
    includeQuestions.addEventListener("change", () => renderList(getState(), window.questions || []));

    endBackBtn.addEventListener("click", () => closeEnd());

    endResetBtn.addEventListener("click", () => {
      const ok = confirm("Reset the whole game? This will delete all progress and answers.");
      if (!ok) return;
      window.Store.clear();
      window.Store.clearViewer();
      history.replaceState(null, "", location.pathname + location.search);
      location.reload();
    });

    exportPdfBtn.addEventListener("click", async () => {
      const state = getState();
      const questions = window.questions || [];
      const { filtered } = renderList(state, questions);

      const nameA = state.players?.A || "Player A";
      const nameB = state.players?.B || "Player B";

      const items = filtered.map((it) => ({
        number: it.number,
        set: it.set,
        question: it.question,
        nameA,
        nameB,
        answerA: it.answerA || "",
        answerB: it.answerB || "",
      }));

      const total = (Array.isArray(state.order) ? state.order.length : questions.length) || 36;
      const revealed = getItems(state, questions).filter(x => x.locked).length;

      await window.PDFExport.exportComparisonToPdf({
        title: "36 Questions — Conclusion",
        subtitle: `${nameA} & ${nameB}`,
        metaPills: [
          `Fully revealed: ${revealed} / ${total}`,
          `Exported: ${new Date().toLocaleString()}`,
        ],
        items,
        includeQuestions: includeQuestions.checked,
      });
    });
  }

  window.EndGame = { open: openEnd, close: closeEnd, bind };
})();
