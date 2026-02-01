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

  const lockBtn = qs("lockBtn");
  const lockInfo = qs("lockInfo");

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

  // Phase 2A (1): runtime-only memory to animate reveal once per question
  const revealedMemory = {}; // qid -> boolean (not stored)

  function ensureViewer() {
    if (viewer === "A" || viewer === "B") return viewer;

    const isA = confirm("Assign this device:\n\nOK = Player A\nCancel = Player B");
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

    // normalize
    const cur = getLockEntry(qid);
    state.locks[qid] = cur;
    return cur;
  }

  function bothLocked(qid) {
    const l = getLockEntry(qid);
    return !!(l.A.locked && l.B.locked);
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
    myNote.classList.toggle("is-locked", myLocked);

    lockBtn.textContent = myLocked ? "Unlock (edit)" : "Lock my answer";
    lockBtn.classList.toggle("is-locked", myLocked);

    if (myLocked && !reveal) {
      lockInfo.textContent = "Locked. Waiting for partner…";
    } else if (myLocked && reveal) {
      lockInfo.textContent = "Both locked ✅";
    } else if (!myLocked && reveal) {
      lockInfo.textContent = "Partner locked ✅ (lock yours to reveal)";
    } else {
      lockInfo.textContent = "";
    }
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

    // Phase 2A (1): reveal animation only on transition hidden -> revealed
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

  // Merge import (notes)
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

  // Merge import (locks) - locked always wins
  function mergeLocksIntoState(incomingLocks) {
    const inc = incomingLocks || {};
    state.locks = state.locks || {};

    Object.keys(inc).forEach((qid) => {
      const existing = getLockEntry(qid);
      const incoming = inc[qid] || {};

      // support legacy booleans
      const inNorm =
        (incoming && typeof incoming === "object" && (typeof incoming.A === "boolean" || typeof incoming.B === "boolean"))
          ? {
              A: { locked: !!incoming.A, lockedAt: null },
              B: { locked: !!incoming.B, lockedAt: null },
            }
          : {
              A: incoming.A && typeof incoming.A === "object"
                ? { locked: !!incoming.A.locked, lockedAt: typeof incoming.A.lockedAt === "number" ? incoming.A.lockedAt : null }
                : { locked: false, lockedAt: null },
              B: incoming.B && typeof incoming.B === "object"
                ? { locked: !!incoming.B.locked, lockedAt: typeof incoming.B.lockedAt === "number" ? incoming.B.lockedAt : null }
                : { locked: false, lockedAt: null },
            };

      const pick = (side) => {
        const e = existing[side];
        const n = inNorm[side];
        if (n.locked && !e.locked) return n;
        if (n.locked && e.locked) {
          const ea = typeof e.lockedAt === "number" ? e.lockedAt : null;
          const na = typeof n.lockedAt === "number" ? n.lockedAt : null;
          if (ea === null) return n;
          if (na === null) return e;
          return na < ea ? n : e;
        }
        return e;
      };

      state.locks[qid] = { A: pick("A"), B: pick("B") };
    });
  }

  // Events
  startBtn.addEventListener("click", startGame);

  myNote.addEventListener("input", () => {
    ensureOrder();
    const me = ensureViewer();
    const qid = state.order[state.index];

    // if locked, ignore typing
    const locks = ensureLockEntry(qid);
    if (locks[me].locked) return;

    const entry = ensureEntry(qid);
    entry[me] = myNote.value;
    save();
    renderAnsweredTable(); // cheap update
  });

  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      ensureOrder();
      const me = ensureViewer();
      const qid = state.order[state.index];

      const locks = ensureLockEntry(qid);
      const entry = ensureEntry(qid);

      // cannot lock empty (prevents dumb mistakes)
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
  }

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
    mergeLocksIntoState(payload.locks || {});

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
      mergeLocksIntoState(payload.locks || {});

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
