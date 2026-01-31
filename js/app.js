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

  const startScreen = qs("start-screen");
  const appScreen = document.querySelector(".app");

  const playerAInput = qs("playerAInput");
  const playerBInput = qs("playerBInput");
  const startBtn = qs("startGame");

  const qText = qs("question");
  const progress = qs("progress");
  const setLabel = qs("set");
  const playerLabel = qs("player");
  const note = qs("note");

  const prevBtn = qs("prev");
  const nextBtn = qs("next");
  const resetBtn = qs("reset");

  const shareBtn = qs("share");
  const copyBtn = qs("copyLink");
  const shareInfo = qs("shareInfo");

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
    progress.textContent = `Question ${state.index + 1} / ${state.order.length}`;

    const currentName = state.players[state.player];
    playerLabel.textContent = currentName ? currentName : `Player ${state.player}`;

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

  // -----------------------------
  // Boot
  // -----------------------------
  window.Session.tryLoadFromUrl(state);

  if (state.players.A && state.players.B) {
    showGameScreen();
    render();
  } else {
    showStartScreen();
  }
})();
