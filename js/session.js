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

  function normalizeLocks(locks) {
    const out = (locks && typeof locks === "object") ? locks : {};
    Object.keys(out).forEach((qid) => {
      const v = out[qid];

      // legacy boolean map -> upgrade
      if (v && typeof v === "object" && (typeof v.A === "boolean" || typeof v.B === "boolean")) {
        out[qid] = {
          A: { locked: !!v.A, lockedAt: null },
          B: { locked: !!v.B, lockedAt: null },
        };
        return;
      }

      if (!v || typeof v !== "object") {
        out[qid] = {
          A: { locked: false, lockedAt: null },
          B: { locked: false, lockedAt: null },
        };
        return;
      }

      const a = v.A && typeof v.A === "object" ? v.A : {};
      const b = v.B && typeof v.B === "object" ? v.B : {};

      out[qid] = {
        A: { locked: !!a.locked, lockedAt: typeof a.lockedAt === "number" ? a.lockedAt : null },
        B: { locked: !!b.locked, lockedAt: typeof b.lockedAt === "number" ? b.lockedAt : null },
      };
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

  // Locked always wins (true beats false). Keep earliest lockedAt if present.
  function mergeLocks(existingLocks, incomingLocks) {
    const ex = normalizeLocks(existingLocks);
    const inc = normalizeLocks(incomingLocks);

    Object.keys(inc).forEach((qid) => {
      const exq = ex[qid] || {
        A: { locked: false, lockedAt: null },
        B: { locked: false, lockedAt: null },
      };
      const inq = inc[qid];

      const pick = (side) => {
        const e = exq[side] || { locked: false, lockedAt: null };
        const n = inq[side] || { locked: false, lockedAt: null };

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

      ex[qid] = { A: pick("A"), B: pick("B") };
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
      state.locks = mergeLocks(state.locks || {}, payload.locks || {});

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
      locks: state.locks,
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
