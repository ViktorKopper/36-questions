(function () {
  // -----------------------------
  // Data check
  // -----------------------------
  const questions = window.questions;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    alert("Questions failed to load. Check js/questions.js path and script order.");
    throw new Error("Questions not found on window.questions");
  }

  // -----------------------------
  // DOM
  // -----------------------------
  const qs = window.Utils.qs;

  const answeredTbody = qs("answeredTbody");


  const startScreen = qs("start-screen");
  const appScreen = document.querySelector(".app");

  const playerAInput = qs("playerAInput");
  const playerBInput = qs("playerBInput");
  const startBtn = qs("startGame");

  const qText = qs("question");
  const progressFill = qs("progressFill");
  const progressLabel = qs("progressLabel");

  const setLabel = qs("set");
  const playerLabel = qs("player");
  const note = qs("note");

  const prevBtn = qs("prev");
  const nextBtn = qs("next");
  const resetBtn = qs("reset");

  const shareBtn = qs("share");
  const copyBtn = qs("copyLink");
  const shareInfo = qs("shareInfo");

  const importLink = document.getElementById("importLink");
  const importBtn = document.getElementById("importBtn");


  // -----------------------------
  // State
  // -----------------------------
  const state = window.Store.load();
  const save = () => window.Store.save(state);

  // -----------------------------
  // UI helpers
  // -----------------------------
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

  // -----------------------------
  // Game logic
  // -----------------------------
  function togglePlayer() {
    state.player = state.player === "A" ? "B" : "A";
  }

  function ensureOrder() {
    if (state.order.length) return;

    const set1 = questions.filter((q) => q.set === 1).map((q) => q.id);
    const set2 = questions.filter((q) => q.set === 2).map((q) => q.id);
    const set3 = questions.filter((q) => q.set === 3).map((q) => q.id);

    state.order = [
      ...window.Utils.shuffle(set1),
      ...window.Utils.shuffle(set2),
      ...window.Utils.shuffle(set3),
    ];
  }

  function updateProgress(currentIndex, total) {
  const percent = Math.round(((currentIndex + 1) / total) * 100);

  progressFill.style.width = percent + "%";
  progressLabel.textContent = `Question ${currentIndex + 1} / ${total}`;

  // aria update
  const bar = progressFill.parentElement;
  bar.setAttribute("aria-valuemax", String(total));
  bar.setAttribute("aria-valuenow", String(currentIndex + 1));
}

  function getNoteEntry(qid) {
  const v = state.notes?.[qid];
  if (!v) return { A: "", B: "" };
  if (typeof v === "string") return { A: v, B: "" }; // legacy
  return { A: typeof v.A === "string" ? v.A : "", B: typeof v.B === "string" ? v.B : "" };
}

function isAnswered(text) {
  return typeof text === "string" && text.trim().length > 0;
}

function renderAnsweredTable() {
  if (!answeredTbody) return;

  const me = ensureViewer(); // už to máš z predchádzajúceho kroku
  const them = me === "A" ? "B" : "A";

  // Build rows in order (36)
  const rows = state.order.map((qid, i) => {
    const q = window.Utils.getQuestionById(questions, qid);
    const entry = getNoteEntry(qid);

    const aOn = isAnswered(entry[me]);
    const bOn = isAnswered(entry[them]);

    // set number: 1..3 (12 per set)
    const setNum = Math.floor(i / 12) + 1;

    // shorten question a bit for table
    const text = (q?.text || "").trim();
    const short = text.length > 68 ? text.slice(0, 68) + "…" : text;

    const isCurrent = i === state.index ? "is-current" : "";

    return `
      <tr class="${isCurrent}" data-idx="${i}">
        <td>${i + 1}</td>
        <td>${setNum}</td>
        <td class="qtext">${escapeHtml(short)}</td>
        <td class="col-small">
          <span class="badge a ${aOn ? "on" : ""}"></span>
        </td>
        <td class="col-small">
          <span class="badge b ${bOn ? "on" : ""}"></span>
        </td>
      </tr>
    `;
  });

  answeredTbody.innerHTML = rows.join("");

  // Click to jump
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


  function render() {
    ensureOrder();

    const questionId = state.order[state.index];
    const q = window.Utils.getQuestionById(questions, questionId);

    if (!q) {
      // Safety fallback
      state.index = 0;
      const firstId = state.order[0];
      const firstQ = window.Utils.getQuestionById(questions, firstId);
      qText.textContent = firstQ ? firstQ.text : "Question not found.";
      save();
      return;
    }

    qText.textContent = q.text;
    setLabel.textContent = `Set ${q.set} / 3`;
    updateProgress(state.index, state.order.length);

    const currentName = state.players[state.player];
    playerLabel.textContent = currentName ? currentName : `Player ${state.player}`;

    renderAnsweredTable();


    note.value = state.notes[q.id] || "";
    save();
  }

  function next() {
    ensureOrder();
    if (state.index < state.order.length - 1) {
      state.index++;
      togglePlayer();
      render();
    }
  }

  function prev() {
    ensureOrder();
    if (state.index > 0) {
      state.index--;
      togglePlayer();
      render();
    }
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

  // -----------------------------
  // Events
  // -----------------------------
  note.addEventListener("input", () => {
    ensureOrder();
    const questionId = state.order[state.index];
    const q = window.Utils.getQuestionById(questions, questionId);
    if (!q) return;

    state.notes[q.id] = note.value;
    save();
  });

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  resetBtn.addEventListener("click", () => {
    const ok = confirm("Reset the whole game? This will delete all progress and notes.");
    if (!ok) return;
    window.Store.clear();
    location.hash = "";
    location.reload();
  });

  startBtn.addEventListener("click", startGame);

  [playerAInput, playerBInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") startGame();
    });
  });

  shareBtn?.addEventListener("click", () => {
    const url = window.Session.buildSessionUrl(state);
    setShareMessage("Session link created. Tap “Copy Link” and send it to your partner.", url);
  });

  copyBtn?.addEventListener("click", async () => {
    const link = shareInfo.dataset.link || window.Session.buildSessionUrl(state);
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage("Copied ✅ Send the link to your partner.", link);
    } catch {
      prompt("Copy this link:", link);
      setShareMessage("Link ready (manual copy).", link);
    }
  });
  
  function mergeNotesIntoState(incomingNotes) {
  const inNotes = incomingNotes || {};
  state.notes = state.notes || {};

  Object.keys(inNotes).forEach((qid) => {
    const incoming = inNotes[qid];

    const normIncoming =
      typeof incoming === "string"
        ? { A: incoming, B: "" }
        : {
            A: incoming && typeof incoming.A === "string" ? incoming.A : "",
            B: incoming && typeof incoming.B === "string" ? incoming.B : "",
          };

    const existing = state.notes[qid];
    const normExisting =
      typeof existing === "string"
        ? { A: existing, B: "" }
        : {
            A: existing && typeof existing.A === "string" ? existing.A : "",
            B: existing && typeof existing.B === "string" ? existing.B : "",
          };

    // non-empty wins (incoming > existing)
    state.notes[qid] = {
      A: normIncoming.A || normExisting.A,
      B: normIncoming.B || normExisting.B,
    };
  });
}

importBtn.addEventListener("click", () => {
  const url = (importLink.value || "").trim();
  if (!url) return;

  const payload = window.Session.decodePayloadFromUrl(url);
  if (!payload || !payload.notes) {
    alert("Invalid link. Paste the full session link with #s=...");
    return;
  }

  mergeNotesIntoState(payload.notes);

  // optional: merge players too (if you want)
  if (payload.players && typeof payload.players === "object") {
    state.players = state.players || {};
    state.players.A = payload.players.A || state.players.A;
    state.players.B = payload.players.B || state.players.B;
  }

  window.Store.save(state);

  // refresh so UI shows both answers "after merge"
  location.reload();
});


  // -----------------------------
  // Boot
  // -----------------------------
  window.Session.tryLoadFromUrl(state);

  // One-time refresh after hash merge so UI shows merged state cleanly
if (location.hash.startsWith("#s=") && !sessionStorage.getItem("36q:justMerged")) {
  sessionStorage.setItem("36q:justMerged", "1");
  // po merge to môžeš vyčistiť, nech link neostane v URL
  history.replaceState(null, "", location.pathname + location.search);
  location.reload();
} else {
  sessionStorage.removeItem("36q:justMerged");
}


  if (state.players.A && state.players.B) {
    showGameScreen();
    render();
  } else {
    showStartScreen();
  }

async function tryAutoImportFromClipboard() {
  // už raz riešené v tejto session → neotravuj
  if (sessionStorage.getItem("36q:autoImportDone")) return;

  // musí bežať v secure context (https / localhost)
  if (!navigator.clipboard || !window.isSecureContext) return;

  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.includes("#s=")) return;

    const payload = window.Session.decodePayloadFromUrl(text);
    if (!payload || !payload.notes) return;

    const confirmImport = confirm(
      "Partner session detected in clipboard.\n\nImport answers and sync now?"
    );

    if (!confirmImport) {
      sessionStorage.setItem("36q:autoImportDone", "1");
      return;
    }

    // --- MERGE NOTES ---
    const inNotes = payload.notes || {};
    state.notes = state.notes || {};

    Object.keys(inNotes).forEach((qid) => {
      const incoming = inNotes[qid];

      const normIncoming =
        typeof incoming === "string"
          ? { A: incoming, B: "" }
          : {
              A: incoming && typeof incoming.A === "string" ? incoming.A : "",
              B: incoming && typeof incoming.B === "string" ? incoming.B : "",
            };

      const existing = state.notes[qid];
      const normExisting =
        typeof existing === "string"
          ? { A: existing, B: "" }
          : {
              A: existing && typeof existing.A === "string" ? existing.A : "",
              B: existing && typeof existing.B === "string" ? existing.B : "",
            };

      state.notes[qid] = {
        A: normIncoming.A || normExisting.A,
        B: normIncoming.B || normExisting.B,
      };
    });

    // merge players (optional but nice)
    if (payload.players && typeof payload.players === "object") {
      state.players = state.players || {};
      state.players.A = payload.players.A || state.players.A;
      state.players.B = payload.players.B || state.players.B;
    }

    window.Store.save(state);

    sessionStorage.setItem("36q:autoImportDone", "1");

    // vyčisti URL (ak tam bol hash) a refreshni UI
    history.replaceState(null, "", location.pathname + location.search);
    location.reload();
  } catch (err) {
    // ticho zlyhaj – clipboard býva citlivý
    console.debug("Clipboard auto-import skipped:", err);
  }
}

// spusti po loadnutí appky
setTimeout(tryAutoImportFromClipboard, 600);


})();
