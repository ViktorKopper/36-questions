(function () {
  const questions = window.questions;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    alert("Questions failed to load. Check js/questions.js path and script order.");
    throw new Error("Questions not found on window.questions");
  }

  const qs = window.Utils.qs;

  // DOM
  const startScreen = qs("start-screen");
  const appScreen = document.querySelector(".app");

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

  const answeredTbody = qs("answeredTbody");

  const prevBtn = qs("prev");
  const nextBtn = qs("next");
  const resetBtn = qs("reset");

  const shareBtn = qs("share");
  const copyBtn = qs("copyLink");
  const shareInfo = qs("shareInfo");

  const importLink = qs("importLink");
  const importBtn = qs("importBtn");

  // State
  const state = window.Store.load();
  const save = () => window.Store.save(state);

  // Load from URL hash (merge)
  window.Session.tryLoadFromUrl(state);

  // Viewer: which device is A/B
  let viewer = window.Store.getViewer();

  function ensureViewer() {
    if (viewer === "A" || viewer === "B") return viewer;

    // idiot-proof: only OK/CANCEL -> only A/B possible
    const isA = confirm(
      "Assign this device:\n\nOK = Player A\nCancel = Player B"
    );

    viewer = isA ? "A" : "B";
    window.Store.setViewer(viewer);
    return viewer;
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

  function toggleTurn() {
    state.player = state.player === "A" ? "B" : "A";
  }

  // Progress bar
  function updateProgress(currentIndex, total) {
    const percent = Math.round(((currentIndex + 1) / total) * 100);
    progressFill.style.width = percent + "%";
    progressLabel.textContent = `Question ${currentIndex + 1} / ${total}`;

    const bar = progressFill.parentElement;
    bar.setAttribute("aria-valuemax", String(total));
    bar.setAttribute("aria-valuenow", String(currentIndex + 1));
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

  // Answered table
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

  function renderAnsweredTable() {
    if (!answeredTbody) return;

    const me = ensureViewer();
    const them = otherPlayer(me);

    const rows = state.order.map((qid, i) => {
      const q = window.Utils.getQuestionById(questions, qid);
      const entry = getEntry(qid);

      const myOn = isAnswered(entry[me]);
      const theirOn = isAnswered(entry[them]);

      const setNum = Math.floor(i / 12) + 1;
      const text = (q?.text || "").trim();
      const short = text.length > 68 ? text.slice(0, 68) + "…" : text;

      const isCurrent = i === state.index ? "is-current" : "";

      return `
        <tr class="${isCurrent}" data-idx="${i}">
          <td>${i + 1}</td>
          <td>${setNum}</td>
          <td class="qtext">${escapeHtml(short)}</td>
          <td class="col-small"><span class="badge a ${myOn ? "on" : ""}"></span></td>
          <td class="col-small"><span class="badge b ${theirOn ? "on" : ""}"></span></td>
        </tr>
      `;
    });

    answeredTbody.innerHTML = rows.join("");

    answeredTbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        const idx = Number(tr.getAttribute("data-idx"));
        if (Number.isNaN(idx)) return;
        state.index = Math.max(0, Math.min(idx, state.order.length - 1));
        save();
        render();
      });
    });
  }

  // Render
  function render() {
    ensureOrder();

    if (!state.order.length) return;

    if (state.index < 0) state.index = 0;
    if (state.index > state.order.length - 1) state.index = state.order.length - 1;

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
    theirNote.value = entry[them] || "";

    renderAnsweredTable();
    save();
  }

  // Navigation
  function next() {
    ensureOrder();
    if (state.index < state.order.length - 1) {
      state.index++;
      toggleTurn();
      save();
      render();
    }
  }

  function prev() {
    ensureOrder();
    if (state.index > 0) {
      state.index--;
      toggleTurn();
      save();
      render();
    }
  }

  // Start game
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

  // Merge import
  function mergeNotesIntoState(incomingNotes) {
    const inc = incomingNotes || {};
    state.notes = state.notes || {};

    Object.keys(inc).forEach((qid) => {
      const incoming = inc[qid];
      const normIncoming =
        typeof incoming === "string"
          ? { A: incoming, B: "" }
          : {
              A: incoming && typeof incoming.A === "string" ? incoming.A : "",
              B: incoming && typeof incoming.B === "string" ? incoming.B : "",
            };

      const existing = getEntry(qid);

      // non-empty wins: incoming > existing
      state.notes[qid] = {
        A: normIncoming.A || existing.A,
        B: normIncoming.B || existing.B,
      };
    });
  }

  // Events
  startBtn.addEventListener("click", startGame);

  myNote.addEventListener("input", () => {
    ensureOrder();
    const me = ensureViewer();
    const qid = state.order[state.index];
    const entry = ensureEntry(qid);
    entry[me] = myNote.value;
    save();
    renderAnsweredTable(); // cheap update
  });

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

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
    if (!payload || !payload.notes) {
      alert("Invalid link. Paste the full session link with #s=...");
      return;
    }

    mergeNotesIntoState(payload.notes);

    // merge players too
    if (payload.players && typeof payload.players === "object") {
      state.players = state.players || { A: "", B: "" };
      state.players.A = payload.players.A || state.players.A;
      state.players.B = payload.players.B || state.players.B;
    }

    save();
    history.replaceState(null, "", location.pathname + location.search);
    location.reload();
  });

  // Auto-detect partner link from clipboard
  async function tryAutoImportFromClipboard() {
    if (sessionStorage.getItem("36q:autoImportDone")) return;
    if (!navigator.clipboard || !window.isSecureContext) return;

    try {
      const text = await navigator.clipboard.readText();
      if (!text || (!text.includes("#s=") && !text.includes("#session="))) return;

      const payload = window.Session.decodePayloadFromUrl(text);
      if (!payload || !payload.notes) return;

      const ok = confirm("Partner session detected in clipboard.\n\nImport answers and sync now?");
      sessionStorage.setItem("36q:autoImportDone", "1");
      if (!ok) return;

      mergeNotesIntoState(payload.notes);

      if (payload.players && typeof payload.players === "object") {
        state.players = state.players || { A: "", B: "" };
        state.players.A = payload.players.A || state.players.A;
        state.players.B = payload.players.B || state.players.B;
      }

      save();
      history.replaceState(null, "", location.pathname + location.search);
      location.reload();
    } catch {
      // ignore clipboard permission issues
    }
  }

  // Init
  if (state.players.A && state.players.B) {
    showGameScreen();
  } else {
    showStartScreen();
  }

  // render first
  render();

  // clipboard auto import (slight delay)
  setTimeout(tryAutoImportFromClipboard, 600);
})();
