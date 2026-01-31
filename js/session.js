// URL session (share/join)
(function () {
  function tryLoadFromUrl(state) {
    if (!location.hash.startsWith("#session=")) return false;
    const token = location.hash.slice("#session=".length);

    try {
      const payload = window.Utils.decodeSession(token);

      state.index = typeof payload.index === "number" ? payload.index : 0;
      state.player = payload.player === "A" || payload.player === "B" ? payload.player : "A";
      state.players = payload.players || { A: "", B: "" };
      state.notes = payload.notes || {};
      state.order = Array.isArray(payload.order) ? payload.order : [];

      // Final migration pass
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
    return `${location.origin}${location.pathname}#session=${token}`;
  }

  window.Session = {
    tryLoadFromUrl,
    buildSessionUrl,
  };

  function decodePayloadFromUrl(url) {
  try {
    const u = new URL(url);
    const hash = u.hash || "";
    if (!hash.startsWith("#s=")) return null;

    const token = hash.slice(3);
    const json = window.Utils.base64UrlDecode(token);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

window.Session.decodePayloadFromUrl = decodePayloadFromUrl;

})();
