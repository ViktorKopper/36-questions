(function () {
  const questions = window.questions;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    alert("Questions failed to load. Check js/questions.js path and script order.");
    throw new Error("Questions not found on window.questions");
  }

  const qs = window.Utils.qs;

  // DOM
  const startScreen = qs("start-screen");
  const appScreen = qs("game-layout"); // IMPORTANT: show/hide the WHOLE 2-panel layout

  const playerAInput = qs("playerAInput");
  const playerBInput = qs("playerBInput");
  const startBtn = qs("startGame");

  const setLabel = qs("set");
  const playerLabel = qs("player");

  const qText = qs("question");
  const progressFill = qs("progressFill");
  const progressLabel = qs("progressLabel");

  const myNote = qs("myNote");
  const theirNote = qs("theirNote");
  const myAnswerLabel = qs("myAnswerLabel");
  const theirAnswerLabel = qs("theirAnswerLabel");

  const lockBtn = qs("lockBtn");
  const lockInfo = qs("lockInfo");

  const answeredTbody = qs("answeredTbody");

  const prevBtn = qs("prev");
  const nextBtn = qs("next");
  const resetBtn = qs("reset");
  const finishBtn = qs("finishBtn");
  const earlyFinishBtn = qs("earlyFinishBtn");



  const shareBtn = qs("share");
  const copyBtn = qs("copyLink");
  const shareInfo = qs("shareInfo");

  const importLink = qs("importLink");
  const importBtn = qs("importBtn");

  // Merge UI
  const mergeReportEl = qs("mergeReport");
  const conflictModal = qs("conflictModal");
  const conflictModalBackdrop = qs("conflictModalBackdrop");
  const conflictModalClose = qs("conflictModalClose");
  const conflictModalBody = qs("conflictModalBody");


  // State
  const state = window.Store.load();
  const save = () => window.Store.save(state);

  // Load from URL hash (merge)
  window.Session.tryLoadFromUrl(state);

  // Viewer: which device is A/B
  let viewer = window.Store.getViewer();
  if (window.EndGame && typeof window.EndGame.bind === "function") {
    window.EndGame.bind(() => state);
  }


  // runtime-only memory to animate reveal once per question
  const revealedMemory = {}; // qid -> boolean (not stored)

  function ensureViewer() {
    if (viewer === "A" || viewer === "B") return viewer;

    const isA = confirm("Assign this device:\n\nOK = Player A\nCancel = Player B");
    viewer = isA ? "A" : "B";
    window.Store.setViewer(viewer);
    return viewer;
  }

  function isViewerA() {
    // viewer je "A" / "B" (device assignment)
    return ensureViewer() === "A";
  }

  function otherPlayer(p) {
    return p === "A" ? "B" : "A";
  }

  // UI screens
  function showGameScreen() {
    startScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
  }

  function showStartScreen() {
    startScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }

  function setShareMessage(text, url) {
    shareInfo.textContent = text;
    if (url) shareInfo.dataset.link = url;
  }

  // Merge UI helpers
  function esc(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shortPreview(s, max = 220) {
    const t = String(s || "").trim();
    if (t.length <= max) return t;
    return t.slice(0, max) + "…";
  }

  function openConflictModal(html) {
    if (!conflictModal || !conflictModalBody) return;
    conflictModalBody.innerHTML = html;
    conflictModal.classList.remove("hidden");
    conflictModal.setAttribute("aria-hidden", "false");
  }

  function closeConflictModal() {
    if (!conflictModal || !conflictModalBody) return;
    conflictModal.classList.add("hidden");
    conflictModal.setAttribute("aria-hidden", "true");
    conflictModalBody.innerHTML = "";
  }

  conflictModalBackdrop?.addEventListener("click", closeConflictModal);
  conflictModalClose?.addEventListener("click", closeConflictModal);


  // Order of questions
  function ensureOrder() {
    if (Array.isArray(state.order) && state.order.length === questions.length) return;

    const set1 = questions.filter((q) => q.set === 1).map((q) => q.id);
    const set2 = questions.filter((q) => q.set === 2).map((q) => q.id);
    const set3 = questions.filter((q) => q.set === 3).map((q) => q.id);

    state.order = [
      ...window.Utils.shuffle(set1),
      ...window.Utils.shuffle(set2),
      ...window.Utils.shuffle(set3),
    ];
  }

  function qidToNumber(qid) {
    ensureOrder();
    const i = state.order.indexOf(qid);
    return i >= 0 ? i + 1 : "?";
  }

  function applyConflictResolution(conflict, choice) {
    const { qid, side } = conflict;
    state.notes = state.notes || {};
    state.locks = state.locks || {};

    if (!state.notes[qid]) state.notes[qid] = { A: "", B: "" };
    if (!state.locks[qid]) state.locks[qid] = { A: { locked: false, lockedAt: null }, B: { locked: false, lockedAt: null } };

    if (choice === "incoming") {
      state.notes[qid][side] = conflict.incomingText || "";
      if (conflict.type === "both_locked_different") {
        state.locks[qid][side] = {
          locked: true,
          lockedAt: (typeof conflict.incomingLock?.lockedAt === "number" ? conflict.incomingLock.lockedAt : state.locks[qid][side].lockedAt),
        };
      }
    } else {
      state.notes[qid][side] = conflict.localText || "";
      if (conflict.type === "both_locked_different") {
        state.locks[qid][side] = {
          locked: true,
          lockedAt: (typeof conflict.localLock?.lockedAt === "number" ? conflict.localLock.lockedAt : state.locks[qid][side].lockedAt),
        };
      }
    }
  }

  function renderMergeReport(report) {
    if (!mergeReportEl) return;

    if (!report || report.merged !== true) {
      mergeReportEl.classList.add("hidden");
      mergeReportEl.innerHTML = "";
      return;
    }

    const c = report.conflicts?.length || 0;
    const lw = report.applied?.lockedWins || 0;
    const fe = report.applied?.filledEmpties || 0;

    mergeReportEl.classList.remove("hidden");
    mergeReportEl.classList.toggle("ok", c === 0);
    mergeReportEl.classList.toggle("warn", c > 0);

    const badgeClass = c === 0 ? "ok" : "warn";
    const badgeText = c === 0 ? "No conflicts" : `${c} conflict(s)`;

    const conflictsHtml = (report.conflicts || []).map((x, idx) => {
      const sideName = x.side === "A" ? (state.players?.A || "You") : (state.players?.B || "Partner");
      const typeLabel = x.type === "both_locked_different"
        ? "Both locked (different text)"
        : "Both written (unlocked, different text)";

      return `
        <div class="conflict-item" data-idx="${idx}">
          <div class="conflict-top">
            <div class="conflict-meta">
              <b>#${qidToNumber(x.qid)}</b> • side: <b>${esc(sideName)}</b><br/>
              <span style="opacity:.8">${esc(typeLabel)}</span>
            </div>
            <div class="conflict-actions">
              <button class="btn btn-secondary btn-mini" data-action="details" data-idx="${idx}">Details</button>
              <button class="btn btn-secondary btn-mini" data-action="keepLocal" data-idx="${idx}">Keep mine</button>
              <button class="btn btn-primary btn-mini" data-action="keepIncoming" data-idx="${idx}">Keep theirs</button>
            </div>
          </div>

          <div class="conflict-preview">
            <div class="preview-box">
              <div class="preview-title">Local (current)</div>
              ${esc(shortPreview(x.localText))}
            </div>
            <div class="preview-box">
              <div class="preview-title">Incoming (imported)</div>
              ${esc(shortPreview(x.incomingText))}
            </div>
          </div>
        </div>
      `;
    }).join("");

    mergeReportEl.innerHTML = `
      <div class="merge-title">
        <h3>Import merge report</h3>
        <span class="badge ${badgeClass}">${esc(badgeText)}</span>
      </div>
      <div class="merge-summary">
        Locked wins applied: <b>${lw}</b> • Filled empty answers: <b>${fe}</b>
        ${c ? "<br/>Resolve conflicts below (recommended)." : ""}
      </div>
      ${c ? `<div class="merge-conflicts">${conflictsHtml}</div>` : ""}
    `;

    mergeReportEl.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const idx = Number(btn.getAttribute("data-idx"));
      const conflict = report.conflicts[idx];
      if (!conflict) return;

      if (action === "details") {
        openConflictModal(`
          <div style="opacity:.9; margin-bottom:10px;">
            <b>Question #${esc(qidToNumber(conflict.qid))}</b> • side: <b>${esc(conflict.side)}</b><br/>
            type: <b>${esc(conflict.type)}</b>
          </div>
          <div class="conflict-preview">
            <div class="preview-box">
              <div class="preview-title">Local</div>
              ${esc(conflict.localText)}
            </div>
            <div class="preview-box">
              <div class="preview-title">Incoming</div>
              ${esc(conflict.incomingText)}
            </div>
          </div>
        `);
        return;
      }

      if (action === "keepLocal") {
        applyConflictResolution(conflict, "local");
        report.conflicts.splice(idx, 1);
        state.mergeReport = report;
        save();
        render();
        renderMergeReport(report);
        return;
      }

      if (action === "keepIncoming") {
        applyConflictResolution(conflict, "incoming");
        report.conflicts.splice(idx, 1);
        state.mergeReport = report;
        save();
        render();
        renderMergeReport(report);
        return;
      }
    };
  }


  function toggleTurn() {
    state.player = state.player === "A" ? "B" : "A";
  }

  // Progress bar
  function updateProgress(currentIndex, total) {
    const percent = Math.round(((currentIndex + 1) / total) * 100);
    progressFill.style.width = percent + "%";
    progressLabel.textContent = `Question ${currentIndex + 1} / ${total}`;
  }

  // Notes shape helpers
  function getEntry(qid) {
    const v = state.notes?.[qid];
    if (!v) return { A: "", B: "" };
    if (typeof v === "string") return { A: v, B: "" }; // legacy
    return {
      A: typeof v.A === "string" ? v.A : "",
      B: typeof v.B === "string" ? v.B : "",
    };
  }

  function ensureEntry(qid) {
    const v = state.notes?.[qid];
    if (!state.notes) state.notes = {};
    if (!v) state.notes[qid] = { A: "", B: "" };
    else if (typeof v === "string") state.notes[qid] = { A: v, B: "" };
    else {
      state.notes[qid] = {
        A: typeof v.A === "string" ? v.A : "",
        B: typeof v.B === "string" ? v.B : "",
      };
    }
    return state.notes[qid];
  }

  // Locks helpers
  function getLockEntry(qid) {
    const v = state.locks?.[qid];
    if (!v || typeof v !== "object") {
      return {
        A: { locked: false, lockedAt: null },
        B: { locked: false, lockedAt: null },
      };
    }

    // support legacy {A:boolean,B:boolean}
    if (typeof v.A === "boolean" || typeof v.B === "boolean") {
      return {
        A: { locked: !!v.A, lockedAt: null },
        B: { locked: !!v.B, lockedAt: null },
      };
    }

    const a = v.A && typeof v.A === "object" ? v.A : {};
    const b = v.B && typeof v.B === "object" ? v.B : {};

    return {
      A: { locked: !!a.locked, lockedAt: typeof a.lockedAt === "number" ? a.lockedAt : null },
      B: { locked: !!b.locked, lockedAt: typeof b.lockedAt === "number" ? b.lockedAt : null },
    };
  }

  function ensureLockEntry(qid) {
    if (!state.locks) state.locks = {};
    const v = state.locks[qid];
    if (!v || typeof v !== "object") {
      state.locks[qid] = {
        A: { locked: false, lockedAt: null },
        B: { locked: false, lockedAt: null },
      };
      return state.locks[qid];
    }

    // upgrade legacy
    if (typeof v.A === "boolean" || typeof v.B === "boolean") {
      state.locks[qid] = {
        A: { locked: !!v.A, lockedAt: null },
        B: { locked: !!v.B, lockedAt: null },
      };
      return state.locks[qid];
    }

    const cur = getLockEntry(qid);
    state.locks[qid] = cur;
    return cur;
  }

  function bothLocked(qid) {
    const l = getLockEntry(qid);
    return !!(l.A.locked && l.B.locked);
  }

  function isCompleteGame() {
    ensureOrder();
    return state.order.every((qid) => bothLocked(qid));
  }


  function isAnswered(text) {
    return typeof text === "string" && text.trim().length > 0;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Answered table
  function renderAnsweredTable() {
    if (!answeredTbody) return;

    const me = ensureViewer();
    const them = otherPlayer(me);

    const rows = state.order.map((qid, i) => {
      const q = window.Utils.getQuestionById(questions, qid);
      const entry = getEntry(qid);
      const locks = getLockEntry(qid);

      const myHasText = isAnswered(entry[me]);
      const theirHasText = isAnswered(entry[them]);

      const myLocked = !!locks[me].locked;
      const theirLocked = !!locks[them].locked;

      const setNum = Math.floor(i / 12) + 1;
      const text = (q?.text || "").trim();
      const short = text.length > 68 ? text.slice(0, 68) + "…" : text;

      const isCurrent = i === state.index ? "is-current" : "";

      const myClass = myLocked ? "on" : (myHasText ? "draft" : "");
      const theirClass = theirLocked ? "on" : (theirHasText ? "draft" : "");

      return `
        <tr class="${isCurrent}" data-idx="${i}">
          <td>${i + 1}</td>
          <td>${setNum}</td>
          <td class="qtext">${escapeHtml(short)}</td>
          <td class="col-small"><span class="badge a ${myClass}"></span></td>
          <td class="col-small"><span class="badge b ${theirClass}"></span></td>
        </tr>
      `;
    });

    answeredTbody.innerHTML = rows.join("");

    answeredTbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        const idx = Number(tr.getAttribute("data-idx"));
        if (Number.isNaN(idx)) return;
        state.index = Math.max(0, Math.min(idx, state.order.length - 1));
        if (finishBtn) {
          finishBtn.classList.toggle("hidden", !isCompleteGame());
        }
        if (earlyFinishBtn) {
          earlyFinishBtn.classList.toggle("hidden", !isViewerA());
        }
        save();
        render();
      });
    });
  }

  function updateLockUi(qid) {
    if (!lockBtn || !lockInfo) return;

    const me = ensureViewer();
    const locks = ensureLockEntry(qid);
    const myLocked = !!locks[me].locked;
    const reveal = bothLocked(qid);

    myNote.readOnly = myLocked;
    lockBtn.textContent = myLocked ? "Unlock (edit)" : "Lock my answer";

    if (myLocked && !reveal) lockInfo.textContent = "Locked. Waiting for partner…";
    else if (myLocked && reveal) lockInfo.textContent = "Both locked ✅";
    else if (!myLocked && reveal) lockInfo.textContent = "Partner locked ✅ (lock yours to reveal)";
    else lockInfo.textContent = "";
  }

  // Render
  function render() {
    ensureOrder();
    if (!state.order.length) return;

    state.index = Math.max(0, Math.min(state.index || 0, state.order.length - 1));

    const qid = state.order[state.index];
    const q = window.Utils.getQuestionById(questions, qid);
    if (!q) return;

    qText.textContent = q.text;
    setLabel.textContent = `Set ${q.set} / 3`;
    updateProgress(state.index, state.order.length);

    const currentName = state.players[state.player];
    playerLabel.textContent = currentName ? currentName : `Player ${state.player}`;

    const me = ensureViewer();
    const them = otherPlayer(me);

    myAnswerLabel.textContent = `${state.players[me] || `Player ${me}`} (you)`;
    theirAnswerLabel.textContent = `${state.players[them] || `Player ${them}`}`;

    const entry = getEntry(qid);
    myNote.value = entry[me] || "";

    const nowRevealed = bothLocked(qid);
    const wasRevealed = !!revealedMemory[qid];

    if (nowRevealed) {
      theirNote.value = entry[them] || "";
      theirNote.placeholder = "Partner's answer";

      if (!wasRevealed) {
        revealedMemory[qid] = true;
        theirNote.classList.add("reveal-pop");
        setTimeout(() => theirNote.classList.remove("reveal-pop"), 650);
      }
    } else {
      theirNote.value = "";
      theirNote.placeholder = "Hidden until both of you lock your answers…";
      revealedMemory[qid] = false;
      theirNote.classList.remove("reveal-pop");
    }

    updateLockUi(qid);
    renderAnsweredTable();
    renderMergeReport(state.mergeReport);
    save();
  }

  function startGame() {
    const nameA = playerAInput.value.trim();
    const nameB = playerBInput.value.trim();

    if (!nameA || !nameB) {
      alert("Please enter both player names ❤️");
      return;
    }

    state.players.A = nameA;
    state.players.B = nameB;
    ensureOrder();
    save();
    showGameScreen();
    render();
  }

  // Events
  startBtn.addEventListener("click", startGame);

  myNote.addEventListener("input", () => {
    ensureOrder();
    const me = ensureViewer();
    const qid = state.order[state.index];

    const locks = ensureLockEntry(qid);
    if (locks[me].locked) return;

    const entry = ensureEntry(qid);
    entry[me] = myNote.value;
    save();
    renderAnsweredTable();
  });

  lockBtn.addEventListener("click", () => {
    ensureOrder();
    const me = ensureViewer();
    const qid = state.order[state.index];

    const locks = ensureLockEntry(qid);
    const entry = ensureEntry(qid);

    if (!locks[me].locked && !isAnswered(entry[me])) {
      alert("Write something first, then lock it 🙂");
      return;
    }

    if (!locks[me].locked) {
      locks[me].locked = true;
      locks[me].lockedAt = Date.now();
    } else {
      const ok = confirm("Unlock your answer for editing? This will hide answers again until both lock.");
      if (!ok) return;
      locks[me].locked = false;
      locks[me].lockedAt = null;
    }

    save();
    render();
  });

  nextBtn.addEventListener("click", () => {
    ensureOrder();
    if (state.index < state.order.length - 1) {
      state.index++;
      toggleTurn();
      save();
      render();
    }
  });

  prevBtn.addEventListener("click", () => {
    ensureOrder();
    if (state.index > 0) {
      state.index--;
      toggleTurn();
      save();
      render();
    }
  });

  finishBtn?.addEventListener("click", () => {
    if (!window.EndGame) return;
    window.EndGame.open(state);
  });

  earlyFinishBtn?.addEventListener("click", () => {
    if (!isViewerA()) {
      alert("Only Player A can open early conclusion.");
      return;
    }
    if (!window.EndGame) return;

    // Optional confirmation, lebo je to “predčasne”
    const ok = confirm("Open Conclusion early?\n\nUnfinished / unlocked answers may stay hidden.");
    if (!ok) return;

    window.EndGame.open(state);
  });


  resetBtn.addEventListener("click", () => {
    const ok = confirm("Reset the whole game? This will delete all progress and answers.");
    if (!ok) return;
    window.Store.clear();
    window.Store.clearViewer();
    history.replaceState(null, "", location.pathname + location.search);
    location.reload();
  });

  shareBtn.addEventListener("click", () => {
    const url = window.Session.buildSessionUrl(state);
    setShareMessage("Share this link with your partner:", url);
  });

  copyBtn.addEventListener("click", async () => {
    const url = window.Session.buildSessionUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied ✅", url);
    } catch {
      setShareMessage("Could not copy automatically. Copy it manually:", url);
    }
  });

  importBtn.addEventListener("click", () => {
    const url = (importLink.value || "").trim();
    if (!url) return;

    const payload = window.Session.decodePayloadFromUrl(url);
    if (!payload) {
      alert("Invalid link. Paste the full session link with #s=...");
      return;
    }

    if (!window.Session.mergeIntoState) {
      alert("Merge function missing. session.js not updated?");
      return;
    }

    const report = window.Session.mergeIntoState(state, payload);
    state.mergeReport = report;
    save();

    // Update UI (no reload needed)
    render();
    renderMergeReport(report);

    // Optional: clear hash so you don't accidentally re-merge on refresh
    history.replaceState(null, "", location.pathname + location.search);
  });


  // Init
  if (state.players?.A && state.players?.B) showGameScreen();
  else showStartScreen();

  render();
})();
