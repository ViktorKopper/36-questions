// localStorage persistence + state migration
(function () {
  const STORAGE_KEY = "36q:gameState";
  const VIEWER_KEY = "36q:viewer";

  function defaultState() {
    return {
      index: 0,
      player: "A", // whose turn label (optional, we still toggle)
      players: { A: "", B: "" },
      notes: {},   // { [qid]: {A:"",B:""} }
      order: [],   // randomized order of question IDs
    };
  }

  function normalizeNotes(notes) {
    const out = (notes && typeof notes === "object") ? notes : {};
    Object.keys(out).forEach((qid) => {
      const v = out[qid];

      // legacy string -> A slot
      if (typeof v === "string") {
        out[qid] = { A: v, B: "" };
        return;
      }

      if (!v || typeof v !== "object") {
        out[qid] = { A: "", B: "" };
        return;
      }

      out[qid] = {
        A: typeof v.A === "string" ? v.A : "",
        B: typeof v.B === "string" ? v.B : "",
      };
    });
    return out;
  }

  function migrateState(raw) {
    const s = raw && typeof raw === "object" ? raw : {};

    if (typeof s.index !== "number") s.index = 0;
    if (s.player !== "A" && s.player !== "B") s.player = "A";

    if (!s.players || typeof s.players !== "object") s.players = { A: "", B: "" };
    if (typeof s.players.A !== "string") s.players.A = "";
    if (typeof s.players.B !== "string") s.players.B = "";

    s.order = Array.isArray(s.order) ? s.order : [];
    s.notes = normalizeNotes(s.notes);

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

  function getViewer() {
    const v = localStorage.getItem(VIEWER_KEY);
    return v === "A" || v === "B" ? v : null;
  }

  function setViewer(v) {
    if (v !== "A" && v !== "B") return;
    localStorage.setItem(VIEWER_KEY, v);
  }

  function clearViewer() {
    localStorage.removeItem(VIEWER_KEY);
  }

  window.Store = {
    STORAGE_KEY,
    VIEWER_KEY,
    defaultState,
    migrateState,
    load,
    save,
    clear,
    getViewer,
    setViewer,
    clearViewer,
  };
})();
