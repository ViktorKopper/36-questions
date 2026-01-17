/* ================================
   Background hearts generator
   ================================ */

(function generateHearts() {
  const container = document.getElementById("hearts-bg");
  if (!container) return;

  const HEART_COUNT = 28; // uprav podľa chuti

  for (let i = 0; i < HEART_COUNT; i++) {
    const heart = document.createElement("div");
    heart.className = "heart";

    const size = Math.random() * 120 + 40; // 40px – 160px
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const opacity = Math.random() * 0.25 + 0.05;
    const brightness = Math.random() * 0.6 + 0.5;
    const rotation = Math.random() * 40 - 20;

    heart.style.width = `${size}px`;
    heart.style.height = `${size}px`;
    heart.style.left = `${x}%`;
    heart.style.top = `${y}%`;
    heart.style.opacity = opacity;
    heart.style.filter = `brightness(${brightness})`;
    heart.style.setProperty("--rot", `${rotation}deg`);

    container.appendChild(heart);
  }
})();

(() => {
  // -----------------------------
  // Helpers
  // -----------------------------
  const qs = (id) => document.getElementById(id);

  function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
  }

  function encodeSession(data) {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  }

  function decodeSession(str) {
    const json = decodeURIComponent(escape(atob(str)));
    return JSON.parse(json);
  }

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getQuestionById(id) {
    return window.questions.find((q) => q.id === id);
  }

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
  let state = safeParse(localStorage.getItem("gameState")) || {
    index: 0,
    player: "A",
    players: { A: "", B: "" },
    notes: {},
    order: [] // random order of question IDs
  };

  // Backward-compatible defaults (older saved state migration)
  state.players = state.players || { A: "", B: "" };
  state.notes = state.notes || {};
  state.order = Array.isArray(state.order) ? state.order : [];
  if (typeof state.index !== "number") state.index = 0;
  if (state.player !== "A" && state.player !== "B") state.player = "A";

  function save() {
    localStorage.setItem("gameState", JSON.stringify(state));
  }

  // -----------------------------
  // URL session (share/join)
  // -----------------------------
  function tryLoadFromUrl() {
    if (!location.hash.startsWith("#session=")) return false;
    const token = location.hash.slice("#session=".length);

    try {
      const payload = decodeSession(token);

      state.index = typeof payload.index === "number" ? payload.index : 0;
      state.player = payload.player === "A" || payload.player === "B" ? payload.player : "A";
      state.players = payload.players || { A: "", B: "" };
      state.notes = payload.notes || {};
      state.order = Array.isArray(payload.order) ? payload.order : [];

      // apply defaults again just in case
      state.players = state.players || { A: "", B: "" };
      state.notes = state.notes || {};
      state.order = Array.isArray(state.order) ? state.order : [];

      save();
      return true;
    } catch (e) {
      console.error("Failed to load session from URL", e);
      return false;
    }
  }

  function buildSessionUrl() {
    const payload = {
      index: state.index,
      player: state.player,
      players: state.players,
      notes: state.notes,
      order: state.order
    };
    const token = encodeSession(payload);
    return `${location.origin}${location.pathname}#session=${token}`;
  }

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
      ...shuffle(set1),
      ...shuffle(set2),
      ...shuffle(set3)
    ];
  }

  function render() {
    ensureOrder();

    const questionId = state.order[state.index];
    const q = getQuestionById(questionId);

    if (!q) {
      // Safety fallback
      state.index = 0;
      const firstId = state.order[0];
      const firstQ = getQuestionById(firstId);
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
    const q = getQuestionById(questionId);
    if (!q) return;

    state.notes[q.id] = note.value;
    save();
  });

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem("gameState");
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
    const url = buildSessionUrl();
    setShareMessage("Session link created. Tap “Copy Link” and send it to your partner.", url);
  });

  copyBtn?.addEventListener("click", async () => {
    const link = shareInfo.dataset.link || buildSessionUrl();
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
  tryLoadFromUrl();

  if (state.players.A && state.players.B) {
    showGameScreen();
    render();
  } else {
    showStartScreen();
  }
})();
