// URL session (share/join) + merge
(function () {
  function normalizeNotes(notes) {
    const out = (notes && typeof notes === "object") ? notes : {};
    Object.keys(out).forEach((qid) => {
      const v = out[qid];
      if (typeof v === "string") out[qid] = { A: v, B: "" };
      else if (!v || typeof v !== "object") out[qid] = { A: "", B: "" };
      else {
        out[qid] = {
          A: typeof v.A === "string" ? v.A : "",
          B: typeof v.B === "string" ? v.B : "",
        };
      }
    });
    return out;
  }

  function mergeNotes(existingNotes, incomingNotes) {
    const ex = normalizeNotes(existingNotes);
    const inc = normalizeNotes(incomingNotes);

    Object.keys(inc).forEach((qid) => {
      const a = inc[qid].A || (ex[qid] ? ex[qid].A : "");
      const b = inc[qid].B || (ex[qid] ? ex[qid].B : "");
      ex[qid] = { A: a, B: b };
    });

    return ex;
  }

  // Accept both old "#session=" and new "#s="
  function extractTokenFromHash() {
    const h = location.hash || "";
    if (h.startsWith("#s=")) return h.slice(3);
    if (h.startsWith("#session=")) return h.slice("#session=".length);
    return null;
  }

  function tryLoadFromUrl(state) {
    const token = extractTokenFromHash();
    if (!token) return false;

    try {
      const payload = window.Utils.decodeSession(token);

      // merge payload into existing state (don't nuke local)
      state.index = typeof payload.index === "number" ? payload.index : state.index;
      state.player = (payload.player === "A" || payload.player === "B") ? payload.player : state.player;

      if (payload.players && typeof payload.players === "object") {
        state.players = state.players || { A: "", B: "" };
        state.players.A = payload.players.A || state.players.A;
        state.players.B = payload.players.B || state.players.B;
      }

      if (Array.isArray(payload.order) && payload.order.length) {
        state.order = payload.order;
      }

      state.notes = mergeNotes(state.notes || {}, payload.notes || {});

      // final migrate + save
      const migrated = window.Store.migrateState(state);
      Object.keys(migrated).forEach((k) => (state[k] = migrated[k]));
      window.Store.save(state);
      return true;
    } catch (e) {
      console.error("Failed to load session from URL", e);
      return false;
    }
  }

  function buildSessionUrl(state) {
    const payload = {
      index: state.index,
      player: state.player,
      players: state.players,
      notes: state.notes,
      order: state.order,
    };
    const token = window.Utils.encodeSession(payload);
    return `${location.origin}${location.pathname}#s=${token}`;
  }

  function decodePayloadFromUrl(url) {
    try {
      const u = new URL(url);
      const hash = u.hash || "";
      if (!hash.startsWith("#s=") && !hash.startsWith("#session=")) return null;
      const token = hash.startsWith("#s=") ? hash.slice(3) : hash.slice("#session=".length);
      return window.Utils.decodeSession(token);
    } catch {
      return null;
    }
  }

  window.Session = {
    tryLoadFromUrl,
    buildSessionUrl,
    decodePayloadFromUrl,
  };
})();
