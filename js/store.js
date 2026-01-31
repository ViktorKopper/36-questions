// localStorage persistence + state migration
(function () {
  const STORAGE_KEY = "36q:gameState";

  function defaultState() {
    return {
      index: 0,
      player: "A",
      players: { A: "", B: "" },
      notes: {},
      order: [], // randomized order of question IDs
    };
  }

  function migrateState(raw) {
    const s = raw && typeof raw === "object" ? raw : {}; 

    // Backward-compatible defaults
    if (typeof s.index !== "number") s.index = 0;
    if (s.player !== "A" && s.player !== "B") s.player = "A";
    s.players = s.players || { A: "", B: "" };
    s.notes = s.notes || {};
    s.order = Array.isArray(s.order) ? s.order : [];

    // Ensure shape
    if (!s.players || typeof s.players !== "object") s.players = { A: "", B: "" };
    if (!s.notes || typeof s.notes !== "object") s.notes = {};
    if (!Array.isArray(s.order)) s.order = [];

    return s;
  }

  function load() {
    const parsed = window.Utils.safeParse(localStorage.getItem(STORAGE_KEY));
    return migrateState(parsed || defaultState());
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.Store = {
    STORAGE_KEY,
    defaultState,
    migrateState,
    load,
    save,
    clear,
  };
})();
