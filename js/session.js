// URL session (share/join) + robust merge (per question, per side)
(function () {
  function normStr(v) {
    return typeof v === "string" ? v : "";
  }
  function cleanStr(s) {
    return normStr(s).replace(/\r\n/g, "\n").trim();
  }
  function sameText(a, b) {
    return cleanStr(a) === cleanStr(b);
  }

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

  function normalizePayload(payload) {
    const p = (payload && typeof payload === "object") ? payload : {};
    return {
      index: typeof p.index === "number" ? p.index : null,
      player: (p.player === "A" || p.player === "B") ? p.player : null,
      players: (p.players && typeof p.players === "object") ? p.players : null,
      order: Array.isArray(p.order) ? p.order : null,
      notes: normalizeNotes(p.notes),
      locks: normalizeLocks(p.locks),
    };
  }

  function pickByLockedAt(localSide, incomingSide) {
    // both locked & different -> choose earlier lockedAt
    const l = localSide || { locked: false, lockedAt: null };
    const r = incomingSide || { locked: false, lockedAt: null };

    const la = typeof l.lockedAt === "number" ? l.lockedAt : null;
    const ra = typeof r.lockedAt === "number" ? r.lockedAt : null;

    if (la === null && ra === null) return "local"; // can't decide -> keep local
    if (la === null) return "incoming";
    if (ra === null) return "local";
    return ra < la ? "incoming" : "local";
  }

  /**
   * Merge incoming payload into existing state (mutates state).
   * Returns report: { merged: true, conflicts: [...], applied: {lockedWins, filledEmpties} }
   */
  function mergeIntoState(state, incomingPayload) {
    const report = {
      merged: false,
      conflicts: [],
      applied: { lockedWins: 0, filledEmpties: 0 },
    };

    if (!state || typeof state !== "object") return report;

    const inc = normalizePayload(incomingPayload);
    state.notes = normalizeNotes(state.notes || {});
    state.locks = normalizeLocks(state.locks || {});
    state.players = (state.players && typeof state.players === "object") ? state.players : { A: "", B: "" };
    state.order = Array.isArray(state.order) ? state.order : [];

    // players: only fill missing
    if (inc.players) {
      if (!state.players.A) state.players.A = normStr(inc.players.A);
      if (!state.players.B) state.players.B = normStr(inc.players.B);
    }

    // order: set only if local missing
    if ((!state.order || !state.order.length) && inc.order && inc.order.length) {
      state.order = inc.order;
    }

    // Merge qids union
    const qids = new Set([
      ...Object.keys(state.notes || {}),
      ...Object.keys(inc.notes || {}),
      ...Object.keys(state.locks || {}),
      ...Object.keys(inc.locks || {}),
    ]);

    const sides = ["A", "B"];

    qids.forEach((qid) => {
      const exN = state.notes[qid] || { A: "", B: "" };
      const inN = inc.notes[qid] || { A: "", B: "" };

      const exL = state.locks[qid] || { A: { locked: false, lockedAt: null }, B: { locked: false, lockedAt: null } };
      const inL = inc.locks[qid] || { A: { locked: false, lockedAt: null }, B: { locked: false, lockedAt: null } };

      const outN = { A: normStr(exN.A), B: normStr(exN.B) };
      const outL = {
        A: { locked: !!exL.A?.locked, lockedAt: typeof exL.A?.lockedAt === "number" ? exL.A.lockedAt : null },
        B: { locked: !!exL.B?.locked, lockedAt: typeof exL.B?.lockedAt === "number" ? exL.B.lockedAt : null },
      };

      sides.forEach((side) => {
        const localLocked = !!outL[side].locked;
        const incomingLocked = !!inL[side]?.locked;

        const localText = normStr(outN[side]);
        const incomingText = normStr(inN[side]);

        // 1) LOCK WINS
        if (incomingLocked && !localLocked) {
          outN[side] = incomingText || localText; // if incoming has no text, keep local text
          outL[side] = {
            locked: true,
            lockedAt: typeof inL[side]?.lockedAt === "number" ? inL[side].lockedAt : outL[side].lockedAt,
          };
          report.applied.lockedWins += 1;
          return;
        }

        // both locked
        if (incomingLocked && localLocked) {
          if (!sameText(localText, incomingText) && (cleanStr(localText) || cleanStr(incomingText))) {
            const winner = pickByLockedAt(outL[side], inL[side]);
            if (winner === "incoming") {
              report.conflicts.push({
                qid,
                side,
                type: "both_locked_different",
                kept: "incoming",
              });
              outN[side] = incomingText;
              outL[side] = {
                locked: true,
                lockedAt: typeof inL[side]?.lockedAt === "number" ? inL[side].lockedAt : outL[side].lockedAt,
              };
            } else {
              report.conflicts.push({
                qid,
                side,
                type: "both_locked_different",
                kept: "local",
              });
              // keep local
            }
          }
          return;
        }

        // 2) Not locked: fill empty only, don't overwrite content
        if (!localLocked) {
          if (!cleanStr(localText) && cleanStr(incomingText)) {
            outN[side] = incomingText;
            report.applied.filledEmpties += 1;
          } else if (cleanStr(localText) && cleanStr(incomingText) && !sameText(localText, incomingText)) {
            report.conflicts.push({
              qid,
              side,
              type: "both_unlocked_different",
              kept: "local",
            });
          }
        }

        // locks: keep local unless incoming is locked (handled above)
        // (optional) we can copy lockedAt if local is null and incoming has it, but only if local is locked
        if (outL[side].locked && outL[side].lockedAt === null && typeof inL[side]?.lockedAt === "number") {
          outL[side].lockedAt = inL[side].lockedAt;
        }
      });

      state.notes[qid] = outN;
      state.locks[qid] = outL;
    });

    report.merged = true;
    return report;
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

      // index/player from URL are optional; don't destroy local navigation unless it's clean
      if (typeof payload.index === "number") state.index = payload.index;
      if (payload.player === "A" || payload.player === "B") state.player = payload.player;

      const report = mergeIntoState(state, payload);

      const migrated = window.Store.migrateState(state);
      Object.keys(migrated).forEach((k) => (state[k] = migrated[k]));
      window.Store.save(state);

      // optional: log merge report (no alerts on page load)
      if (report?.conflicts?.length) console.warn("Session URL merge conflicts:", report.conflicts);

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
    mergeIntoState, // <-- use this in Import button
  };
})();
