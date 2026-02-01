(function () {
  const questions = window.questions;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    alert("Questions failed to load. Check js/questions.js path and script order.");
    throw new Error("Questions not found on window.questions");
  }

  const qs = window.Utils.qs;

  /* =========================
     DOM
     ========================= */

  const startScreen = document.querySelector(".start-screen");
  const appScreen = document.querySelector("#game-layout");

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

  /* =========================
     State
     ========================= */

  const state = window.Store.load();
  const save = () => window.Store.save(state);

  window.Session.tryLoadFromUrl(state);

  let viewer = window.Store.getViewer();
  const revealedMemory = {}; // runtime only

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

  /* =========================
     Screen switching
     ========================= */

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

  /* =========================
     Order / progress
     ========================= */

  function ensureOrder() {
    if (Array.isArray(state.order) && state.order.length === questions.length) return;

    const set1 = questions.filter(q => q.set === 1).map(q => q.id);
    const set2 = questions.filter(q => q.set === 2).map(q => q.id);
    const set3 = questions.filter(q => q.set === 3).map(q => q.id);

    state.order = [
      ...window.Utils.shuffle(set1),
      ...window.Utils.shuffle(set2),
      ...window.Utils.shuffle(set3),
    ];
  }

  function toggleTurn() {
    state.player = state.player === "A" ? "B" : "A";
  }

  function updateProgress(currentIndex, total) {
    const percent = Math.round(((currentIndex + 1) / total) * 100);
    progressFill.style.width = percent + "%";
    progressLabel.textContent = `Question ${currentIndex + 1} / ${total}`;
  }

  /* =========================
     Notes & locks helpers
     ========================= */

  function getEntry(qid) {
    const v = state.notes?.[qid];
    if (!v) return { A: "", B: "" };
    if (typeof v === "string") return { A: v, B: "" };
    return { A: v.A || "", B: v.B || "" };
  }

  function ensureEntry(qid) {
    if (!state.notes) state.notes = {};
    if (!state.notes[qid]) state.notes[qid] = { A: "", B: "" };
    return state.notes[qid];
  }

  function getLockEntry(qid) {
    const v = state.locks?.[qid];
    if (!v) {
      return {
        A: { locked: false, lockedAt: null },
        B: { locked: false, lockedAt: null },
      };
    }
    return v;
  }

  function ensureLockEntry(qid) {
    if (!state.locks) state.locks = {};
    if (!state.locks[qid]) {
      state.locks[qid] = {
        A: { locked: false, lockedAt: null },
        B: { locked: false, lockedAt: null },
      };
    }
    return state.locks[qid];
  }

  function bothLocked(qid) {
    const l = getLockEntry(qid);
    return l.A.locked && l.B.locked;
  }

  function isAnswered(text) {
    return typeof text === "string" && text.trim().length > 0;
  }

  /* =========================
     Answered table
     ========================= */

  function renderAnsweredTable() {
    if (!answeredTbody) return;

    const me = ensureViewer();
    const them = otherPlayer(me);

    answeredTbody.innerHTML = state.order
      .map((qid, i) => {
        const q = window.Utils.getQuestionById(questions, qid);
        const entry = getEntry(qid);
        const locks = getLockEntry(qid);

        const myClass = locks[me].locked ? "on" : (isAnswered(entry[me]) ? "draft" : "");
        const theirClass = locks[them].locked ? "on" : (isAnswered(entry[them]) ? "draft" : "");

        return `
          <tr data-idx="${i}">
            <td>${i + 1}</td>
            <td>${q.set}</td>
            <td class="qtext">${q.text}</td>
            <td><span class="badge a ${myClass}"></span></td>
            <td><span class="badge b ${theirClass}"></span></td>
          </tr>
        `;
      })
      .join("");

    answeredTbody.querySelectorAll("tr").forEach(tr => {
      tr.addEventListener("click", () => {
        state.index = Number(tr.dataset.idx);
        save();
        render();
      });
    });
  }

  /* =========================
     Render
     ========================= */

  function render() {
    ensureOrder();

    const qid = state.order[state.index];
    const q = window.Utils.getQuestionById(questions, qid);

    qText.textContent = q.text;
    setLabel.textContent = `Set ${q.set} / 3`;
    updateProgress(state.index, state.order.length);

    const me = ensureViewer();
    const them = otherPlayer(me);

    myAnswerLabel.textContent = `${state.players[me]} (you)`;
    theirAnswerLabel.textContent = state.players[them];

    const entry = getEntry(qid);
    myNote.value = entry[me] || "";

    if (bothLocked(qid)) {
      theirNote.value = entry[them] || "";
    } else {
      theirNote.value = "";
      theirNote.placeholder = "Hidden until both lock";
    }

    renderAnsweredTable();
    save();
  }

  /* =========================
     Events
     ========================= */

  startBtn.addEventListener("click", () => {
    const a = playerAInput.value.trim();
    const b = playerBInput.value.trim();

    if (!a || !b) {
      alert("Enter both player names ❤️");
      return;
    }

    state.players.A = a;
    state.players.B = b;
    ensureOrder();
    save();
    showGameScreen();
    render();
  });

  myNote.addEventListener("input", () => {
    const qid = state.order[state.index];
    const me = ensureViewer();
    const entry = ensureEntry(qid);
    entry[me] = myNote.value;
    save();
    renderAnsweredTable();
  });

  lockBtn.addEventListener("click", () => {
    const qid = state.order[state.index];
    const me = ensureViewer();
    const locks = ensureLockEntry(qid);
    const entry = ensureEntry(qid);

    if (!locks[me].locked && !isAnswered(entry[me])) {
      alert("Write something first 🙂");
      return;
    }

    locks[me].locked = !locks[me].locked;
    locks[me].lockedAt = locks[me].locked ? Date.now() : null;

    save();
    render();
  });

  nextBtn.addEventListener("click", () => {
    if (state.index < state.order.length - 1) {
      state.index++;
      toggleTurn();
      render();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (state.index > 0) {
      state.index--;
      toggleTurn();
      render();
    }
  });

  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset everything?")) return;
    window.Store.clear();
    window.Store.clearViewer();
    location.reload();
  });

  /* =========================
     Init
     ========================= */

  if (state.players.A && state.players.B) {
    showGameScreen();
    render();
  } else {
    showStartScreen();
  }

})();
