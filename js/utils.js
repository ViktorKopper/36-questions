// Shared utilities (no bundler, attach to window)
(function () {
  function qs(id) {
    return document.getElementById(id);
  }

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // UTF-safe base64 for share tokens
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

  function getQuestionById(questions, id) {
    return questions.find((q) => q.id === id);
  }

  window.Utils = {
    qs,
    safeParse,
    encodeSession,
    decodeSession,
    shuffle,
    getQuestionById,
  };
})();
